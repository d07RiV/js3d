#include "malloc.h"

namespace _mem {

const size_t SIZE_MAX = (size_t)-1;
const size_t SIZE_SZ = sizeof(size_t);
const size_t MALLOC_ALIGNMENT = 8;
const size_t MALLOC_ALIGN_MASK = MALLOC_ALIGNMENT - 1;
const size_t HALF_SIZE_MAX = ((size_t)1) << (8 * sizeof(size_t) / 2);

static void malloc_printerr(const char* str) {
  error(str);
  __builtin_unreachable();
}

static int perturb_byte;
static void alloc_perturb(void* p, size_t n) {
  if (__builtin_expect(perturb_byte, 0)) {
    memset(p, perturb_byte ^ 0xff, n);
  }
}
static void free_perturb(void* p, size_t n) {
  if (__builtin_expect(perturb_byte, 0)) {
    memset(p, perturb_byte, n);
  }
}

// Enables a number of assertion checks to catch more memory errors.
// Calling malloc_stats or mallinfo with MALLOC_DEBUG enabled will
// attempt to check every chunk in the course of computing the summaries.
#define MALLOC_DEBUG 0

// Set if call to realloc with zero bytes is the same as a call to free
// Otherwise it will return a unique pointer, similar to malloc(0)
#define REALLOC_ZERO_BYTES_FREES 1

// Set if free() of a very small chunk can immediately lead to trimming.
// Setting to true (1) can reduce memory footprint, but will almost always
// slow down programs that use a lot of small chunks.
#define TRIM_FASTBINS 0

// MORECORE is the name of the routine to call to obtain more memory from the system.
#define MORECORE sbrk

// If MORECORE_CONTIGUOUS is true, take advantage of fact that consecutive calls to
// MORECORE with positive arguments always return contiguous increasing addresses.
#define MORECORE_CONTIGUOUS 1

// Define MORECORE_CANNOT_TRIM if your version of MORECORE cannot release space back
// to the system when given negative arguments.
/* #define MORECORE_CANNOT_TRIM */

// The degree to which the routine mapped to MORECORE zeroes out memory:
//  never (0), only for newly allocated space (1) or always (2)
#define MORECORE_CLEARS 1

// MXFAST is the maximum request size used for "fastbins", special bins
// that hold returned chunks without consolidating their spaces. This
// enables future requests for chunks of the same size to be handled
// very quickly, but can increase fragmentation, and thus increase the
// overall memory footprint of a program.
const size_t MAX_FAST = 64 * SIZE_SZ / 4;

// TRIM_THRESHOLD is the maximum amount of unused top-most memory
// to keep before releasing via malloc_trim in free().
const size_t TRIM_THRESHOLD = 128 * 1024;

// TOP_PAD is the amount of extra `padding' space to allocate or
// retain whenever sbrk is called.
const size_t TOP_PAD = 0;

const size_t PREV_INUSE = 0x01;
const size_t IS_MMAPPED = 0x02;
const size_t NON_MAIN_ARENA = 0x04;
const size_t SIZE_BITS = PREV_INUSE | IS_MMAPPED | NON_MAIN_ARENA;

struct malloc_chunk {
private:
  size_t mchunk_prev_size;
  size_t mchunk_size;
public:
  malloc_chunk* fd;
  malloc_chunk* bk;
  malloc_chunk* fd_nextsize;
  malloc_chunk* bk_nextsize;

  static malloc_chunk* from_mem(void* mem) {
    return (malloc_chunk*)((char*)mem - 2 * SIZE_SZ);
  }
  void* memory() const {
    return (void*)((char*)this + 2 * SIZE_SZ);
  }

  bool prev_inuse() const {
    return mchunk_size & PREV_INUSE;
  }
  bool is_main_arena() const {
    return (mchunk_size & NON_MAIN_ARENA) == 0;
  }
  void set_non_main_arena() {
    mchunk_size |= NON_MAIN_ARENA;
  }

  size_t chunksize() const {
    return mchunk_size & ~SIZE_BITS;
  }
  size_t chunksize_nomask() const {
    return mchunk_size;
  }
  size_t prev_size() const {
    return mchunk_prev_size;
  }

  void set_prev_size(size_t sz) {
    mchunk_prev_size = sz;
  }

  malloc_chunk* chunk_at_offset(ptrdiff_t offset) const {
    return (malloc_chunk*)((char*)this + offset);
  }
  malloc_chunk* next_chunk() const {
    return chunk_at_offset(chunksize());
  }
  malloc_chunk* prev_chunk() const {
    return chunk_at_offset(-(ptrdiff_t)mchunk_prev_size);
  }

  bool inuse() const {
    return next_chunk()->mchunk_size & PREV_INUSE;
  }
  void set_inuse() {
    next_chunk()->mchunk_size |= PREV_INUSE;
  }
  void clear_inuse() {
    next_chunk()->mchunk_size &= ~PREV_INUSE;
  }

  bool is_mmapped() const {
    return (mchunk_size & IS_MMAPPED) != 0;
  }

  bool inuse_at_offset(size_t offset) const {
    return chunk_at_offset(offset)->mchunk_size & PREV_INUSE;
  }
  void set_inuse_at_offset(size_t offset) {
    chunk_at_offset(offset)->mchunk_size |= PREV_INUSE;
  }
  void clear_inuse_at_offset(size_t offset) {
    chunk_at_offset(offset)->mchunk_size &= ~PREV_INUSE;
  }

  void set_head_size(size_t s) {
    mchunk_size = (mchunk_size & SIZE_BITS) | s;
  }
  void set_head(size_t s) {
    mchunk_size = s;
  }
  void set_foot(size_t s) {
    chunk_at_offset(s)->mchunk_prev_size = s;
  }
};

const size_t MIN_CHUNK_SIZE = 16;//(size_t)((char*)&(((malloc_chunk*)0)->fd_nextsize) - (char*)0);
const size_t MINSIZE = (MIN_CHUNK_SIZE + MALLOC_ALIGN_MASK) & ~MALLOC_ALIGN_MASK;

constexpr inline bool aligned_OK(void* m) {
  return ((size_t)m & MALLOC_ALIGN_MASK) == 0;
}
constexpr inline size_t misaligned_chunk(malloc_chunk* p) {
  return (MALLOC_ALIGNMENT == 2 * SIZE_SZ ? (size_t)p : (size_t)p->memory()) & MALLOC_ALIGN_MASK;
}

const size_t REQUEST_OUT_OF_RANGE = (size_t)(-(int)(2 * MINSIZE));
constexpr inline size_t request2size(size_t req) {
  return (req + SIZE_SZ + MALLOC_ALIGN_MASK < MINSIZE ? MINSIZE : (req + SIZE_SZ + MALLOC_ALIGN_MASK) & ~MALLOC_ALIGN_MASK);
}

const size_t NBINS = 128;
const size_t NSMALLBINS = 64;
const size_t SMALLBIN_WIDTH = MALLOC_ALIGNMENT;
const size_t SMALLBIN_CORRECTION = MALLOC_ALIGNMENT > 2 * SIZE_SZ;
const size_t MIN_LARGE_SIZE = (NSMALLBINS - SMALLBIN_CORRECTION) * SMALLBIN_WIDTH;

constexpr inline bool in_smallbin_range(size_t sz) {
  return sz < MIN_LARGE_SIZE;
}
constexpr inline size_t smallbin_index(size_t sz) {
  return sz / SMALLBIN_WIDTH + SMALLBIN_CORRECTION;
}

const size_t FIRST_BIN_CAP = (SIZE_SZ == 8 ? 48 : (MALLOC_ALIGNMENT == 16 ? 45 : 38));
const size_t FIRST_BIN_BASE = (SIZE_SZ == 8 ? 48 : (MALLOC_ALIGNMENT == 16 ? 49 : 56));

inline size_t largebin_index(size_t sz) {
  if ((sz >> 6) <= FIRST_BIN_CAP) return FIRST_BIN_BASE + (sz >> 6);
  if ((sz >> 9) <= 20) return 91 + (sz >> 9);
  if ((sz >> 12) <= 10) return 110 + (sz >> 12);
  if ((sz >> 15) <= 4) return 119 + (sz >> 15);
  if ((sz >> 18) <= 2) return 124 + (sz >> 18);
  return 126;
}

inline size_t bin_index(size_t sz) {
  return in_smallbin_range(sz) ? smallbin_index(sz) : largebin_index(sz);
}

const size_t BINMAPSHIFT = 5;
const size_t BITSPERMAP = 1U << BINMAPSHIFT;
const size_t BINMAPSIZE = (NBINS / BITSPERMAP);
constexpr inline size_t idx2block(size_t i) {
  return i >> BINMAPSHIFT;
}
constexpr inline size_t idx2bit(size_t i) {
  return 1U << (i & (BITSPERMAP - 1));
}

/* offset 2 to use otherwise unindexable first 2 bins */
constexpr inline size_t fastbin_index(size_t sz) {
  return (sz >> (SIZE_SZ == 8 ? 4 : 3)) - 2;
}
const size_t NFASTBINS = fastbin_index(request2size(MAX_FAST)) + 1;

const size_t FASTBIN_CONSOLIDATION_THRESHOLD = 65536;

const int NONCONTIGUOUS_BIT = 2;

inline malloc_chunk* next_bin(malloc_chunk* b) {
  return b->chunk_at_offset(sizeof(malloc_chunk*) * 2);
}
inline malloc_chunk* first(malloc_chunk* b) {
  return b->fd;
}
inline malloc_chunk* last(malloc_chunk* b) {
  return b->bk;
}

struct malloc_state {
  malloc_state();

  int flags;
  bool have_fastchunks;
  malloc_chunk* fastbinsY[NFASTBINS];
  malloc_chunk* top;
  malloc_chunk* last_remainder;
  malloc_chunk* bins[NBINS * 2 - 2];
  unsigned int binmap[BINMAPSIZE];
  size_t system_mem;
  size_t max_system_mem;

  malloc_chunk* bin_at(size_t i) {
    return malloc_chunk::from_mem(&bins[(i - 1) * 2]);
  }

  void unlink(malloc_chunk* p) {
    if (__builtin_expect(p->chunksize() != p->next_chunk()->prev_size(), 0)) {
      malloc_printerr("corrupted size vs. prev_size");
    }
    malloc_chunk* fwd = p->fd;
    malloc_chunk* bck = p->bk;
    if (__builtin_expect(fwd->bk != p || bck->fd != p, 0)) {
      malloc_printerr("corrupted double-linked list");
    } else {
      fwd->bk = bck;
      bck->fd = fwd;
      if (!in_smallbin_range(p->chunksize_nomask()) && __builtin_expect(p->fd_nextsize != nullptr, 0)) {
        if (__builtin_expect(p->fd_nextsize->bk_nextsize != p, 0) ||
            __builtin_expect(p->bk_nextsize->fd_nextsize != p, 0)) {
          malloc_printerr("corrupted double-linked list (not small)");
        }
        if (fwd->fd_nextsize == nullptr) {
          if (p->fd_nextsize == p) {
            fwd->fd_nextsize = fwd->bk_nextsize = fwd;
          } else {
            fwd->fd_nextsize = p->fd_nextsize;
            fwd->bk_nextsize = p->bk_nextsize;
            p->fd_nextsize->bk_nextsize = fwd;
            p->bk_nextsize->fd_nextsize = fwd;
          }
        } else {
          p->fd_nextsize->bk_nextsize = p->bk_nextsize;
          p->bk_nextsize->fd_nextsize = p->fd_nextsize;
        }
      }
    }
  }

  malloc_chunk* unsorted_chunks() {
    return bin_at(1);
  }
  malloc_chunk* initial_top() {
    return unsorted_chunks();
  }

  void mark_bin(size_t i) {
    binmap[idx2block(i)] |= idx2bit(i);
  }
  void unmark_bin(size_t i) {
    binmap[idx2block(i)] &= ~idx2bit(i);
  }
  unsigned int get_binmap(size_t i) {
    return binmap[idx2block(i)] & idx2bit(i); 
  }

  bool contiguous() const {
    return (flags & NONCONTIGUOUS_BIT) == 0;
  }
  bool noncontiguous() const {
    return (flags & NONCONTIGUOUS_BIT) != 0;
  }
  void set_noncontiguous() {
    flags |= NONCONTIGUOUS_BIT;
  }
  void set_contiguous() {
    flags &= ~NONCONTIGUOUS_BIT;
  }

#if !MALLOC_DEBUG
  void check_chunk(malloc_chunk* p) {}
  void check_free_chunk(malloc_chunk* p) {}
  void check_inuse_chunk(malloc_chunk* p) {}
  void check_remalloced_chunk(malloc_chunk* p, size_t s) {}
  void check_malloced_chunk(malloc_chunk* p, size_t s) {}
  void check_state() {}
#else
  void check_chunk(malloc_chunk* p);
  void check_free_chunk(malloc_chunk* p);
  void check_inuse_chunk(malloc_chunk* p);
  void check_remalloced_chunk(malloc_chunk* p, size_t s);
  void check_malloced_chunk(malloc_chunk* p, size_t s);
  void check_state();
#endif

  void* sysmalloc(size_t nb);
  int systrim(size_t pad);

  void* malloc(size_t bytes);
  void free(malloc_chunk* p);
  void* realloc(malloc_chunk* p, size_t oldsize, size_t nb);
  void* memalign(size_t alignment, size_t bytes);

  void consolidate();
};

static struct malloc_state main_arena;
inline malloc_state* arena_for_chunk(malloc_chunk* chunk) {
  return &main_arena;
}

static char* sbrk_base = nullptr;

malloc_state::malloc_state() {
  for (int i = 1; i < NBINS; ++i) {
    malloc_chunk* bin = bin_at(i);
    bin->fd = bin->bk = bin;
  }

  if (!MORECORE_CONTIGUOUS || this != &main_arena) {
    set_noncontiguous();
  }
  have_fastchunks = false;
  top = initial_top();
}

#if MALLOC_DEBUG

void malloc_state::check_chunk(malloc_chunk* p) {
  size_t sz = p->chunksize();
  char* max_address = (char*)top + top->chunksize();
  char* min_address = max_address - system_mem;

  if (!p->is_mmapped()) {
    if (p != top) {
      if (contiguous()) {
        assert((char*)p >= min_address);
        assert((char*)p + sz <= (char*)top);
      }
    } else {
      assert(sz >= MINSIZE);
      assert(p->prev_inuse());
    }
  }
}

void malloc_state::check_free_chunk(malloc_chunk* p) {
  size_t sz = p->chunksize_nomask() & ~(PREV_INUSE | NON_MAIN_ARENA);
  malloc_chunk* next = p->chunk_at_offset(sz);
  check_chunk(p);

  assert(!p->inuse());
  assert(!p->is_mmapped());

  if (sz >= MINSIZE) {
    assert((sz & MALLOC_ALIGN_MASK) == 0);
    assert(aligned_OK(p->memory()));
    assert(p->next_chunk()->prev_size() == sz);
    assert(p->prev_inuse());
    assert(next == top || next->inuse());
    assert(p->fd->bk == p);
    assert(p->bk->fd == p);
  } else {
    assert(sz == SIZE_SZ);
  }
}

void malloc_state::check_inuse_chunk(malloc_chunk* p) {
  check_chunk(p);
  if (p->is_mmapped()) {
    return;
  }
  assert(p->inuse());
  malloc_chunk* next = p->next_chunk();
  if (!p->prev_inuse()) {
    malloc_chunk* prev = p->prev_chunk();
    assert(prev->next_chunk() == p);
    check_free_chunk(prev);
  }
  if (next == top) {
    assert(next->prev_inuse());
    assert(next->chunksize() >= MINSIZE);
  } else if (!next->inuse()) {
    check_free_chunk(next);
  }
}

void malloc_state::check_remalloced_chunk(malloc_chunk* p, size_t s) {
  size_t sz = p->chunksize_nomask() & ~(PREV_INUSE | NON_MAIN_ARENA);

  if (!p->is_mmapped()) {
    assert(this == arena_for_chunk(p));
    if (p->is_main_arena()) {
      assert(this == &main_arena);
    } else {
      assert(this != &main_arena);
    }
  }

  check_inuse_chunk(p);

  assert((sz & MALLOC_ALIGN_MASK) == 0);
  assert(sz >= MINSIZE);
  assert(aligned_OK(p->memory()));
  assert(sz >= s);
  assert(sz - s < MINSIZE);
}

void malloc_state::check_malloced_chunk(malloc_chunk* p, size_t s) {
  check_remalloced_chunk(p, s);
  assert(p->prev_inuse());
}

void malloc_state::check_state() {
  assert(sizeof(size_t) <= sizeof(char*));
  assert((MALLOC_ALIGNMENT & (MALLOC_ALIGNMENT - 1)) == 0);
  assert(top != nullptr);
  if (top == initial_top()) {
    return;
  }

  if (this == &main_arena && contiguous()) {
    assert((char*)sbrk_base + system_mem == (char*)top + top->chunksize());
  }

  assert((MAX_FAST & ~1) <= request2size(MAX_FAST));

  size_t max_fast_bin = fastbin_index(MAX_FAST);
  size_t total = 0;
  for (size_t i = 0; i < NFASTBINS; ++i) {
    malloc_chunk* p = fastbinsY[i];
    if (this == &main_arena && i > max_fast_bin) {
      assert(p == nullptr);
    }
    while (p != nullptr) {
      check_inuse_chunk(p);
      total += p->chunksize();
      assert(fastbin_index(p->chunksize()) == i);
      p = p->fd;
    }
  }
  for (size_t i = 1; i < NBINS; ++i) {
    malloc_chunk* b = bin_at(i);
    if (i >= 2) {
      unsigned int binbit = get_binmap(i);
      bool empty = (last(b) == b);
      if (!binbit) {
        assert(empty);
      } else if (!empty) {
        assert(binbit);
      }
    }
    for (malloc_chunk* p = last(b); p != b; p = p->bk) {
      check_free_chunk(p);
      size_t size = p->chunksize();
      total += size;
      if (i >= 2) {
        size_t idx = bin_index(size);
        assert(idx == i);
        assert(p->bk == b || p->bk->chunksize() >= p->chunksize());
        if (!in_smallbin_range(size)) {
          if (p->fd_nextsize != nullptr) {
            if (p->fd_nextsize == p) {
              assert(p->bk_nextsize == p);
            } else {
              if (p->fd_nextsize == first(b)) {
                assert(p->chunksize() < p->fd_nextsize->chunksize());
              } else {
                assert(p->chunksize() > p->fd_nextsize->chunksize());
              }
              if (p == first(b)) {
                assert(p->chunksize() > p->bk_nextsize->chunksize());
              } else {
                assert(p->chunksize() < p->bk_nextsize->chunksize());
              }
            }
          }
        }
      } else if (!in_smallbin_range(size)) {
        assert(p->fd_nextsize == nullptr && p->bk_nextsize == nullptr);
      }
      for (malloc_chunk* q = p->next_chunk(); q != top && q->inuse() && q->chunksize() >= MINSIZE; q = q->next_chunk()) {
        check_inuse_chunk(q);
      }
    }
  }
  check_chunk(top);
}

#endif

/*
   sysmalloc handles malloc cases requiring more memory from the system.
   On entry, it is assumed that av->top does not have enough
   space to service request for nb bytes, thus requiring that av->top
   be extended or replaced.
 */

void* malloc_state::sysmalloc(size_t nb) {
  malloc_chunk* old_top = top;
  size_t old_size = old_top->chunksize();
  char* old_end = (char*)old_top->chunk_at_offset(old_size);

  char* brk = nullptr;
  char* snd_brk = nullptr;
  assert((old_top == initial_top() && old_size == 0) ||
    (old_size >= MINSIZE && old_top->prev_inuse() && ((size_t)old_end & (dl_pagesize - 1)) == 0));
  assert(old_size < nb + MINSIZE);

  if (this != &main_arena) {
    // ??
  } else {
    size_t size = nb + TOP_PAD + MINSIZE;
    if (contiguous()) {
      size -= old_size;
    }
    size = (size + dl_pagesize - 1) & ~(dl_pagesize - 1);
    if (size > 0) {
      brk = (char*) (MORECORE(size));
    }
    if (brk != nullptr) {
      if (sbrk_base == nullptr) {
        sbrk_base = brk;
      }
      system_mem += size;

      if (brk == old_end && snd_brk == nullptr) {
        old_top->set_head((size + old_size) | PREV_INUSE);
      } else if (contiguous() && old_size && brk < old_end) {
        malloc_printerr("break adjusted to free malloc space");
      } else {
        size_t front_misalign = 0;
        size_t end_misalign = 0;
        long correction = 0;
        char* aligned_brk = brk;
        if (contiguous()) {
          if (old_size) {
            system_mem += brk - old_end;
          }
          front_misalign = (size_t)(((malloc_chunk*)brk)->memory()) & MALLOC_ALIGN_MASK;
          if (front_misalign > 0) {
            correction = MALLOC_ALIGNMENT - front_misalign;
            aligned_brk += correction;
          }
          correction += old_size;
          end_misalign = (size_t)(brk + size + correction);
          correction += ((end_misalign + dl_pagesize - 1) & ~(dl_pagesize - 1)) - end_misalign;
          assert(correction >= 0);
          snd_brk = (char*)(MORECORE(correction));

          if (snd_brk == nullptr) {
            correction = 0;
            snd_brk = (char*)(MORECORE(0));
          }
        } else {
          if (MALLOC_ALIGNMENT == 2 * SIZE_SZ) {
            assert(((size_t)(((malloc_chunk*)brk)->memory()) & MALLOC_ALIGN_MASK) == 0);
          } else {
            front_misalign = (size_t)(((malloc_chunk*)brk)->memory()) & MALLOC_ALIGN_MASK;
            if (front_misalign > 0) {
              aligned_brk += MALLOC_ALIGNMENT - front_misalign;
            }
          }
          if (snd_brk == nullptr) {
            snd_brk = (char*)(MORECORE(0));
          }
        }

        if (snd_brk != nullptr) {
          top = (malloc_chunk*) aligned_brk;
          top->set_head((snd_brk - aligned_brk + correction) | PREV_INUSE);
          system_mem += correction;

          if (old_size != 0) {
            old_size = (old_size - 4 * SIZE_SZ) & ~MALLOC_ALIGN_MASK;
            old_top->set_head(old_size | PREV_INUSE);
            old_top->chunk_at_offset(old_size)->set_head((2 * SIZE_SZ) | PREV_INUSE);
            old_top->chunk_at_offset(old_size + 2 * SIZE_SZ)->set_head((2 * SIZE_SZ) | PREV_INUSE);
            if (old_size >= MINSIZE) {
              //_int_free(old_top, 1);
            }
          }
        }
      }
    }
  }

  if (system_mem > max_system_mem) {
    max_system_mem = system_mem;
  }
  check_state();

  malloc_chunk* p = top;
  size_t size = p->chunksize();

  if (size >= nb + MINSIZE) {
    size_t remainder_size = size - nb;
    malloc_chunk* remainder = p->chunk_at_offset(nb);
    top = remainder;
    p->set_head(nb | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
    remainder->set_head(remainder_size | PREV_INUSE);
    check_malloced_chunk(p, nb);
    return p->memory();
  }

  // ENOMEM
  return nullptr;
}

/*
   systrim is an inverse of sorts to sysmalloc.  It gives memory back
   to the system (via negative arguments to sbrk) if there is unused
   memory at the `high' end of the malloc pool. It is called
   automatically by free() when top space exceeds the trim
   threshold. It is also called by the public malloc_trim routine.  It
   returns 1 if it actually released any memory, else 0.
 */

int malloc_state::systrim(size_t pad) {
  long top_size = top->chunksize();
  long top_area = top_size - MINSIZE - 1;
  if (top_area <= (long)pad) {
    return 0;
  }

  long extra = (top_area - pad) & ~(dl_pagesize - 1);
  if (extra == 0) {
    return 0;
  }

  char* current_brk = (char*)(MORECORE(0));
  if (current_brk == (char*)top + top_size) {
    MORECORE(-extra);

    char* new_brk = (char*)(MORECORE(0));
    if (new_brk != nullptr) {
      long released = (long)(current_brk - new_brk);
      if (released != 0) {
        system_mem -= released;
        top->set_head((top_size - released) | PREV_INUSE);
        check_state();
        return 1;
      }
    }
  }
  return 0;
}

void* malloc(size_t bytes) {
  void* victim = main_arena.malloc(bytes);
  assert(!victim || malloc_chunk::from_mem(victim)->is_mmapped() ||
    &main_arena == arena_for_chunk(malloc_chunk::from_mem(victim)));
  return victim;
}

void free(void* mem) {
  if (mem == nullptr) {
    return;
  }

  malloc_chunk* p = malloc_chunk::from_mem(mem);
  if (p->is_mmapped()) {
    malloc_printerr("mmap not supported");
    return;
  }
  arena_for_chunk(p)->free(p);
}

void* realloc(void* oldmem, size_t bytes) {
#if REALLOC_ZERO_BYTES_FREES
  if (bytes == 0 && oldmem != nullptr) {
    free(oldmem);
    return nullptr;
  }
#endif
  if (oldmem == nullptr) {
    return malloc(bytes);
  }
  malloc_chunk* oldp = malloc_chunk::from_mem(oldmem);
  size_t oldsize = oldp->chunksize();

  malloc_state* ar_ptr = (oldp->is_mmapped() ? nullptr : arena_for_chunk(oldp));

  if (__builtin_expect((size_t)oldp > (size_t)-((ptrdiff_t)oldsize), 0) ||
      __builtin_expect(misaligned_chunk(oldp), 0)) {
    malloc_printerr("realloc(): invalid pointer");
  }

  size_t nb = request2size(bytes);
  if (nb < bytes || nb >= REQUEST_OUT_OF_RANGE) {
    // ENOMEM
    return nullptr;
  }

  if (oldp->is_mmapped()) {
    malloc_printerr("mmap not supported");
  }

  void* newp = ar_ptr->realloc(oldp, oldsize, nb);
  assert(!newp || malloc_chunk::from_mem(newp)->is_mmapped() ||
    ar_ptr == arena_for_chunk(malloc_chunk::from_mem(newp)));
  return newp;
}

void* memalign(size_t alignment, size_t bytes) {
  if (alignment <= MALLOC_ALIGNMENT) {
    return malloc(bytes);
  }
  if (alignment < MINSIZE) {
    alignment = MINSIZE;
  }
  if (alignment > SIZE_MAX / 2 + 1) {
    // EINVAL
    return nullptr;
  }
  if (bytes > SIZE_MAX - alignment - MINSIZE) {
    // ENOMEM
    return nullptr;
  }

  if (((alignment - 1) & alignment) != 0) {
    size_t a = MALLOC_ALIGNMENT * 2;
    while (a < alignment) {
      a <<= 1;
    }
    alignment = a;
  }

  void* p = main_arena.memalign(alignment, bytes);
  assert(!p || malloc_chunk::from_mem(p)->is_mmapped() ||
    &main_arena == arena_for_chunk(malloc_chunk::from_mem(p)));
  return p;
}

void* valloc(size_t bytes) {
  return memalign(dl_pagesize, bytes);
}

void* pvalloc(size_t bytes) {
  size_t rounded_bytes = (bytes + dl_pagesize - 1) & ~(dl_pagesize - 1);
  if (bytes > SIZE_MAX - 2 * dl_pagesize - MINSIZE) {
    // ENOMEM
    return nullptr;
  }
  return memalign(dl_pagesize, rounded_bytes);
}

void* calloc(size_t n, size_t elem_size) {
  size_t bytes = n * elem_size;
  if (__builtin_expect((n | elem_size) > HALF_SIZE_MAX, 0)) {
    if (elem_size != 0 && bytes / elem_size != n) {
      // ENOMEM
      return nullptr;
    }
  }
  size_t sz = bytes;
  malloc_state* av = &main_arena;
  malloc_chunk* oldtop;
  size_t oldtopsize;

  if (av) {
#if MORECORE_CLEARS
    oldtop = av->top;
    oldtopsize = av->top->chunksize();
#if MORECORE_CLEARS < 2
    if (av == &main_arena && (ptrdiff_t)oldtopsize < sbrk_base + av->max_system_mem - (char*)oldtop) {
      oldtopsize = sbrk_base + av->max_system_mem - (char*)oldtop;
    }
#endif
    if (av != &main_arena) {
      malloc_printerr("multiple arenas not supported");
    }
#endif
  }

  void* mem = av->malloc(sz);
  assert(!mem || malloc_chunk::from_mem(mem)->is_mmapped() ||
    av == arena_for_chunk(malloc_chunk::from_mem(mem)));
  if (mem == nullptr) {
    return mem;
  }
  malloc_chunk* p = malloc_chunk::from_mem(mem);
  if (p->is_mmapped()) {
    if (__builtin_expect(perturb_byte, 0)) {
      return memset(mem, 0, sz);
    }
    return mem;
  }
  size_t csz = p->chunksize();
#if MORECORE_CLEARS
  if (perturb_byte == 0 && p == oldtop && csz > oldtopsize) {
    csz = oldtopsize;
  }
#endif

  size_t* d = (size_t*) mem;
  size_t clearsize = csz - SIZE_SZ;
  size_t nclears = clearsize / sizeof(size_t);
  assert(nclears >= 3);
  if (nclears > 9) {
    return memset(d, 0, clearsize);
  } else {
    d[0] = 0;
    d[1] = 0;
    d[2] = 0;
    if (nclears > 4) {
      d[3] = 0;
      d[4] = 0;
      if (nclears > 6) {
        d[5] = 0;
        d[6] = 0;
        if (nclears > 8) {
          d[7] = 0;
          d[8] = 0;
        }
      }
    }
  }
  return mem;
}

////////////////////////////////////////////

void* malloc_state::malloc(size_t bytes) {
  size_t nb = request2size(bytes);
  if (nb < bytes || nb >= REQUEST_OUT_OF_RANGE) {
    // ENOMEM
    return nullptr;
  }

  if (nb <= MAX_FAST) {
    size_t idx = fastbin_index(nb);
    malloc_chunk** fb = &fastbinsY[idx];
    malloc_chunk* victim = *fb;

    if (victim != nullptr) {
      *fb = victim->fd;
      size_t victim_idx = fastbin_index(victim->chunksize());
      if (__builtin_expect(victim_idx != idx, 0)) {
        malloc_printerr("malloc(): memory corruption (fast)");
      }
      check_remalloced_chunk(victim, nb);
      void* p = victim->memory();
      alloc_perturb(p, bytes);
      return p;
    }
  }

  size_t idx;
  if (in_smallbin_range(nb)) {
    // If a small request, check regular bin.  Since these "smallbins"
    // hold one size each, no searching within bins is necessary.
    // (For a large request, we need to wait until unsorted chunks are
    // processed to find best fit. But for small ones, fits are exact
    // anyway, so we can check now, which is faster.)
    idx = smallbin_index(nb);
    malloc_chunk* bin = bin_at(idx);
    malloc_chunk* victim = last(bin);
    if (victim != bin) {
      malloc_chunk* bck = victim->bk;
      if (__builtin_expect(bck->fd != victim, 0)) {
        malloc_printerr("malloc(): smallbin double linked list corrupted");
      }
      victim->set_inuse_at_offset(nb);
      bin->bk = bck;
      bck->fd = bin;
      if (this != &main_arena) {
        victim->set_non_main_arena();
      }
      check_malloced_chunk(victim, nb);
      void* p = victim->memory();
      alloc_perturb(p, bytes);
      return p;
    }
  } else {
    // If this is a large request, consolidate fastbins before continuing.
    // While it might look excessive to kill all fastbins before
    // even seeing if there is space available, this avoids
    // fragmentation problems normally associated with fastbins.
    // Also, in practice, programs tend to have runs of either small or
    // large requests, but less often mixtures, so consolidation is not
    // invoked all that often in most programs. And the programs that
    // it is called frequently in otherwise tend to fragment.
    idx = largebin_index(nb);
    if (have_fastchunks) {
      consolidate();
    }
  }

  // Process recently freed or remaindered chunks, taking one only if
  // it is exact fit, or, if this a small request, the chunk is remainder from
  // the most recent non-exact fit.  Place other traversed chunks in
  // bins.  Note that this step is the only place in any routine where
  // chunks are placed in bins.
  // The outer loop here is needed because we might not realize until
  // near the end of malloc that we should have consolidated, so must
  // do so and retry. This happens at most once, and only when we would
  // otherwise need to expand memory to service a "small" request.
  while (true) {
    int iters = 0;
    malloc_chunk* victim;
    while ((victim = unsorted_chunks()->bk) != unsorted_chunks()) {
      malloc_chunk* bck = victim->bk;
      if (__builtin_expect(victim->chunksize_nomask() <= 2 * SIZE_SZ, 0) ||
          __builtin_expect(victim->chunksize_nomask() > system_mem, 0)) {
        malloc_printerr("malloc(): memory corruption");
      }
      size_t size = victim->chunksize();

      // If a small request, try to use last remainder if it is the
      // only chunk in unsorted bin.  This helps promote locality for
      // runs of consecutive small requests. This is the only
      // exception to best-fit, and applies only when there is
      // no exact fit for a small chunk.
      if (in_smallbin_range(nb) && bck == unsorted_chunks() && victim == last_remainder && size > nb + MINSIZE) {
        size_t remainder_size = size - nb;
        malloc_chunk* remainder = victim->chunk_at_offset(nb);
        unsorted_chunks()->bk = unsorted_chunks()->fd = remainder;
        last_remainder = remainder;
        remainder->bk = remainder->fd = unsorted_chunks();
        if (!in_smallbin_range(remainder_size)) {
          remainder->fd_nextsize = nullptr;
          remainder->bk_nextsize = nullptr;
        }
        victim->set_head(nb | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
        remainder->set_head(remainder_size | PREV_INUSE);
        remainder->set_foot(remainder_size);
        check_malloced_chunk(victim, nb);
        void* p = victim->memory();
        alloc_perturb(p, bytes);
        return p;
      }

      // remove from unsorted list
      if (__builtin_expect(bck->fd != victim, 0)) {
        malloc_printerr("malloc(): corrupted unsorted chunks 3");
      }
      unsorted_chunks()->bk = bck;
      bck->fd = unsorted_chunks();

      // Take now instead of binning if exact fit
      if (size == nb) {
        victim->set_inuse_at_offset(size);
        if (this != &main_arena) {
          victim->set_non_main_arena();
        }
        check_malloced_chunk(victim, nb);
        void* p = victim->memory();
        alloc_perturb(p, bytes);
        return p;
      }

      // place chunk in bin
      size_t victim_index;
      malloc_chunk* fwd;
      if (in_smallbin_range(size)) {
        victim_index = smallbin_index(size);
        bck = bin_at(victim_index);
        fwd = bck->fd;
      } else {
        victim_index = largebin_index(size);
        bck = bin_at(victim_index);
        fwd = bck->fd;
        // maintain large bins in sorted order
        if (fwd != bck) {
          // Or with inuse bit to speed comparisons
          size |= PREV_INUSE;
          // if smaller than smallest, bypass loop below
          assert(bck->bk->is_main_arena());
          if (size < bck->bk->chunksize_nomask()) {
            fwd = bck;
            bck = bck->bk;

            victim->fd_nextsize = fwd->fd;
            victim->bk_nextsize = fwd->fd->bk_nextsize;
            fwd->fd->bk_nextsize = victim->bk_nextsize->fd_nextsize = victim;
          } else {
            assert(fwd->is_main_arena());
            while (size < fwd->chunksize_nomask()) {
              fwd = fwd->fd_nextsize;
              assert(fwd->is_main_arena());
            }
            if (size == fwd->chunksize_nomask()) {
              // Always insert in the second position.
              fwd = fwd->fd;
            } else {
              victim->fd_nextsize = fwd;
              victim->bk_nextsize = fwd->bk_nextsize;
              fwd->bk_nextsize = victim;
              victim->bk_nextsize->fd_nextsize = victim;
            }
            bck = fwd->bk;
          }
        } else {
          victim->fd_nextsize = victim->bk_nextsize = victim;
        }
      }
      mark_bin(victim_index);
      victim->bk = bck;
      victim->fd = fwd;
      fwd->bk = victim;
      bck->fd = victim;

      if (++iters >= 10000) {
        break;
      }
    }

    // If a large request, scan through the chunks of current bin in
    // sorted order to find smallest that fits.  Use the skip list for this.
    if (!in_smallbin_range(nb)) {
      malloc_chunk* bin = bin_at(idx);

      // skip scan if empty or largest chunk is too small
      if ((victim = first(bin)) != bin && victim->chunksize_nomask() >= nb) {
        victim = victim->bk_nextsize;
        size_t size;
        while ((size = victim->chunksize()) < nb) {
          victim = victim->bk_nextsize;
        }

        // Avoid removing the first entry for a size so that the skip
        // list does not have to be rerouted.
        if (victim != last(bin) && victim->chunksize_nomask() == victim->fd->chunksize_nomask()) {
          victim = victim->fd;
        }

        size_t remainder_size = size - nb;
        unlink(victim);

        if (remainder_size < MINSIZE) {
          // Exhaust
          victim->set_inuse_at_offset(size);
          if (this != &main_arena) {
            victim->set_non_main_arena();
          }
        } else {
          // Split
          malloc_chunk* remainder = victim->chunk_at_offset(nb);
          // We cannot assume the unsorted list is empty and therefore
          // have to perform a complete insert here.
          malloc_chunk* bck = unsorted_chunks();
          malloc_chunk* fwd = bck->fd;
          if (__builtin_expect(fwd->bk != bck, 0)) {
            malloc_printerr("malloc(): corrupted unsorted chunks");
          }
          remainder->bk = bck;
          remainder->fd = fwd;
          bck->fd = remainder;
          fwd->bk = remainder;
          if (!in_smallbin_range(remainder_size)) {
            remainder->bk_nextsize = nullptr;
            remainder->fd_nextsize = nullptr;
          }
          victim->set_head(nb | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
          remainder->set_head(remainder_size | PREV_INUSE);
          remainder->set_foot(remainder_size);
        }
        check_malloced_chunk(victim, nb);
        void* p = victim->memory();
        alloc_perturb(p, bytes);
        return p;
      }
    }

    // Search for a chunk by scanning bins, starting with next largest
    // bin. This search is strictly by best-fit; i.e., the smallest
    // (with ties going to approximately the least recently used) chunk
    // that fits is selected.
    // The bitmap avoids needing to check that most blocks are nonempty.
    // The particular case of skipping all bins during warm-up phases
    // when no chunks have been returned yet is faster than it might look.
    ++idx;
    malloc_chunk* bin = bin_at(idx);
    size_t block = idx2block(idx);
    size_t map = binmap[block];
    size_t bit = idx2bit(idx);

    while (true) {
      // Skip rest of block if there are no more set bits in this block.
      if (bit > map || bit == 0) {
        do {
          ++block;
        } while (block < BINMAPSIZE && (map = binmap[block]) == 0);
        if (block >= BINMAPSIZE) {
          // out of bins
          break;
        }
        bin = bin_at(block << BINMAPSHIFT);
        bit = 1;
      }

      // Advance to bin with set bit. There must be one.
      while ((bit & map) == 0) {
        bin = next_bin(bin);
        bit <<= 1;
        assert(bit != 0);
      }

      // Inspect the bin. It is likely to be non-empty
      victim = last(bin);

      // If a false alarm (empty bin), clear the bit.
      if (victim == bin) {
        binmap[block] = (map &= ~bit);
        bin = next_bin(bin);
        bit <<= 1;
      } else {
        size_t size = victim->chunksize();
        // We know the first chunk in this bin is big enough to use.
        assert(size >= nb);
        size_t remainder_size = size - nb;
        unlink(victim);
        if (remainder_size < MINSIZE) {
          // Exhaust
          victim->set_inuse_at_offset(size);
          if (this != &main_arena) {
            victim->set_non_main_arena();
          }
        } else {
          malloc_chunk* remainder = victim->chunk_at_offset(nb);
          // We cannot assume the unsorted list is empty and therefore
          // have to perform a complete insert here.
          malloc_chunk* bck = unsorted_chunks();
          malloc_chunk* fwd = bck->fd;
          if (__builtin_expect(fwd->bk != bck, 0)) {
            malloc_printerr("malloc(): corrupted unsorted chunks 2");
          }
          remainder->bk = bck;
          remainder->fd = fwd;
          bck->fd = remainder;
          fwd->bk = remainder;
          // advertise as last remainder
          if (in_smallbin_range(nb)) {
            last_remainder = remainder;
          }
          if (!in_smallbin_range(remainder_size)) {
            remainder->bk_nextsize = nullptr;
            remainder->fd_nextsize = nullptr;
          }
          victim->set_head(nb | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
          remainder->set_head(remainder_size | PREV_INUSE);
          remainder->set_foot(remainder_size);
        }
        check_malloced_chunk(victim, nb);
        void* p = victim->memory();
        alloc_perturb(p, bytes);
        return p;
      }
    }

    victim = top;
    size_t size = victim->chunksize();
    if (size >= nb + MINSIZE) {
      size_t remainder_size = size - nb;
      malloc_chunk* remainder = victim->chunk_at_offset(nb);
      top = remainder;
      victim->set_head(nb | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
      remainder->set_head(remainder_size | PREV_INUSE);
      check_malloced_chunk(victim, nb);
      void* p = victim->memory();
      alloc_perturb(p, bytes);
      return p;
    } else if (have_fastchunks) {
      // When we are using atomic ops to free fast chunks we can get
      // here for all block sizes.
      consolidate();
      // restore original bin index
      if (in_smallbin_range(nb)) {
        idx = smallbin_index(nb);
      } else {
        idx = largebin_index(nb);
      }
    } else {
      // Otherwise, relay to handle system-dependent cases
      void* p = sysmalloc(nb);
      if (p != nullptr) {
        alloc_perturb(p, bytes);
      }
      return p;
    }
  }
}

void malloc_state::free(malloc_chunk* p) {
  size_t size = p->chunksize();

  // Little security check which won't hurt performance: the
  // allocator never wrapps around at the end of the address space.
  // Therefore we can exclude some size values which might appear
  // here by accident or by "design" from some intruder.
  if (__builtin_expect((size_t)p > (size_t)(-(ptrdiff_t)size), 0) || __builtin_expect(misaligned_chunk(p), 0)) {
    malloc_printerr("free(): invalid pointer");
  }

  // We know that each chunk is at least MINSIZE bytes in size or a
  // multiple of MALLOC_ALIGNMENT.
  if (__builtin_expect(size < MINSIZE || (size & MALLOC_ALIGN_MASK) != 0, 0)) {
    malloc_printerr("free(): invalid size");
  }

  check_inuse_chunk(p);

  // If eligible, place chunk on a fastbin so it can be found
  // and used quickly in malloc.
  if (size <= MAX_FAST
#if TRIM_FASTBINS
      && p->chunk_at_offset(size) != top
#endif
      ) {
    if (__builtin_expect(p->chunk_at_offset(size)->chunksize_nomask() <= 2 * SIZE_SZ, 0) ||
        __builtin_expect(p->chunk_at_offset(size)->chunksize() >= system_mem, 0)) {
      malloc_printerr("free(): invalid next size (fast)");
    }

    free_perturb(p->memory(), size - 2 * SIZE_SZ);

    have_fastchunks = true;
    size_t idx = fastbin_index(size);
    malloc_chunk** fb = &fastbinsY[idx];
    malloc_chunk* old = *fb;
    if (__builtin_expect(old == p, 0)) {
      malloc_printerr("double free or corruption (fasttop)");
    }
    p->fd = old;
    *fb = p;

    // Check that size of fastbin chunk at the top is the same as
    // size of the chunk that we are adding.  We can dereference OLD
    // only if we have the lock, otherwise it might have already been
    // allocated again.
    if (old != nullptr && __builtin_expect(fastbin_index(old->chunksize()) != idx, 0)) {
      malloc_printerr("invalid fastbin entry (free)");
    }
  } else if (!p->is_mmapped()) {
    // Consolidate other non-mmapped chunks as they arrive.
    malloc_chunk* nextchunk = p->chunk_at_offset(size);

    // Lightweight tests: check whether the block is already the top block.
    if (__builtin_expect(p == top, 0)) {
      malloc_printerr("double free or corruption (top)");
    }
    // Or whether the next chunk is beyond the boundaries of the arena.
    if (__builtin_expect(contiguous() && (char*)nextchunk >= (char*)top + top->chunksize(), 0)) {
      malloc_printerr("double free or corruption (out)");
    }
    // Or whether the block is actually not marked used.
    if (__builtin_expect(!nextchunk->prev_inuse(), 0)) {
      malloc_printerr("double free or corruption (!prev)");
    }

    size_t nextsize = nextchunk->chunksize();
    if (__builtin_expect(nextchunk->chunksize_nomask() <= 2 * SIZE_SZ, 0) ||
        __builtin_expect(nextsize >= system_mem, 0)) {
      malloc_printerr("free(): invalid next size (normal)");
    }

    free_perturb(p->memory(), size - 2 * SIZE_SZ);

    // consolidate backward
    if (!p->prev_inuse()) {
      size_t prevsize = p->prev_size();
      size += prevsize;
      p = p->chunk_at_offset(-((long) prevsize));
      unlink(p);
    }

    if (nextchunk != top) {
      // get and clear inuse bit
      bool nextinuse = nextchunk->inuse_at_offset(nextsize);

      // consolidate forward
      if (!nextinuse) {
        unlink(nextchunk);
        size += nextsize;
      } else {
        nextchunk->clear_inuse_at_offset(0);
      }

      // Place the chunk in unsorted chunk list. Chunks are
      // not placed into regular bins until after they have
      // been given one chance to be used in malloc.
      malloc_chunk* bck = unsorted_chunks();
      malloc_chunk* fwd = bck->fd;
      if (__builtin_expect(fwd->bk != bck, 0)) {
        malloc_printerr("free(): corrupted unsorted chunks");
      }
      p->fd = fwd;
      p->bk = bck;
      if (!in_smallbin_range(size)) {
        p->fd_nextsize = nullptr;
        p->bk_nextsize = nullptr;
      }
      bck->fd = p;
      fwd->bk = p;
      p->set_head(size | PREV_INUSE);
      p->set_foot(size);
      check_free_chunk(p);
    } else {
      // If the chunk borders the current high end of memory,
      // consolidate into top
      size += nextsize;
      p->set_head(size | PREV_INUSE);
      top = p;
      check_chunk(p);
    }

    // If freeing a large space, consolidate possibly-surrounding
    // chunks. Then, if the total unused topmost memory exceeds trim
    // threshold, ask malloc_trim to reduce top.
    // Unless max_fast is 0, we don't know if there are fastbins
    // bordering top, so we cannot tell for sure whether threshold
    // has been reached unless fastbins are consolidated.  But we
    // don't want to consolidate on each free.  As a compromise,
    // consolidation is performed if FASTBIN_CONSOLIDATION_THRESHOLD
    // is reached.
    if (size >= FASTBIN_CONSOLIDATION_THRESHOLD) {
      if (have_fastchunks) {
        consolidate();
      }

      if (this == &main_arena) {
#ifndef MORECORE_CANNOT_TRIM
        if (top->chunksize() >= TRIM_THRESHOLD) {
          systrim(TOP_PAD);
        }
#endif
      } else {
        malloc_printerr("multiple arenas not supported");
      }
    }
  } else {
    malloc_printerr("mmap not supported");
  }
}

// malloc_consolidate is a specialized version of free() that tears
// down chunks held in fastbins.  Free itself cannot be used for this
// purpose since, among other things, it might place chunks back onto
// fastbins.  So, instead, we need to use a minor variant of the same
// code.
void malloc_state::consolidate() {
  have_fastchunks = false;

  malloc_chunk* unsorted_bin = unsorted_chunks();

  // Remove each chunk from fast bin and consolidate it, placing it
  // then in unsorted bin. Among other reasons for doing this,
  // placing in unsorted bin avoids needing to calculate actual bins
  // until malloc is sure that chunks aren't immediately going to be
  // reused anyway.
  malloc_chunk** maxfb = &fastbinsY[NFASTBINS - 1];
  malloc_chunk** fb = &fastbinsY[0];
  do {
    malloc_chunk* p = *fb;
    *fb = nullptr;
    if (p != nullptr) {
      malloc_chunk* nextp;
      do {
        size_t idx = fastbin_index(p->chunksize());
        if (__builtin_expect(&fastbinsY[idx] != fb, 0)) {
          malloc_printerr("malloc_consolidate(): invalid chunk size");
        }

        check_inuse_chunk(p);
        nextp = p->fd;

        // Slightly streamlined version of consolidation code in free()
        size_t size = p->chunksize();
        malloc_chunk* nextchunk = p->chunk_at_offset(size);
        size_t nextsize = nextchunk->chunksize();

        if (!p->prev_inuse()) {
          size_t prevsize = p->prev_size();
          size += prevsize;
          p = p->chunk_at_offset(-((long) prevsize));
          unlink(p);
        }

        if (nextchunk != top) {
          bool nextinuse = nextchunk->inuse_at_offset(nextsize);
          if (!nextinuse) {
            size += nextsize;
            unlink(nextchunk);
          } else {
            nextchunk->clear_inuse_at_offset(0);
          }

          malloc_chunk* first_unsorted = unsorted_bin->fd;
          unsorted_bin->fd = p;
          first_unsorted->bk = p;

          if (!in_smallbin_range(size)) {
            p->bk_nextsize = nullptr;
            p->fd_nextsize = nullptr;
          }

          p->set_head(size | PREV_INUSE);
          p->bk = unsorted_bin;
          p->fd = first_unsorted;
          p->set_foot(size);
        } else {
          size += nextsize;
          p->set_head(size | PREV_INUSE);
          top = p;
        }
      } while ((p = nextp) != nullptr);
    }
  } while (fb++ != maxfb);
}

void* malloc_state::realloc(malloc_chunk* oldp, size_t oldsize, size_t nb) {
  if (__builtin_expect(oldp->chunksize_nomask() <= 2 * SIZE_SZ, 0) ||
      __builtin_expect(oldsize >= system_mem, 0)) {
    malloc_printerr("realloc(): invalid old size");
  }
  check_inuse_chunk(oldp);
  // All callers already filter out mmap'ed chunks.
  assert(!oldp->is_mmapped());

  malloc_chunk* next = oldp->chunk_at_offset(oldsize);
  size_t nextsize = next->chunksize();
  if (__builtin_expect(next->chunksize_nomask() < 2 * SIZE_SZ, 0) ||
      __builtin_expect(nextsize >= system_mem, 0)) {
    malloc_printerr("realloc(): invalid next size");
  }

  malloc_chunk* newp;
  size_t newsize;
  if (oldsize >= nb) {
    // already big enough; split below
    newp = oldp;
    newsize = oldsize;
  } else {
    if (next == top && (newsize = oldsize + nextsize) >= nb + MINSIZE) {
      // Try to expand forward into top
      oldp->set_head_size(nb | (this != &main_arena ? NON_MAIN_ARENA : 0));
      top = oldp->chunk_at_offset(nb);
      top->set_head((newsize - nb) | PREV_INUSE);
      check_inuse_chunk(oldp);
      return oldp->memory();
    } else if (next != top && !next->inuse() && (newsize = oldsize + nextsize) >= nb) {
      // Try to expand forward into next chunk;  split off remainder below
      newp = oldp;
      unlink(next);
    } else {
      // allocate, copy, free
      void* newmem = malloc(nb - MALLOC_ALIGN_MASK);
      if (newmem == nullptr) {
        // propagate failure
        return nullptr;
      }

      newp = malloc_chunk::from_mem(newmem);
      newsize = newp->chunksize();

      // Avoid copy if newp is next chunk after oldp.
      if (newp == next) {
        newsize += oldsize;
        newp = oldp;
      } else {
        // Unroll copy of <= 36 bytes (72 if 8byte sizes)
        // We know that contents have an odd number of
        // INTERNAL_SIZE_T-sized words; minimally 3.
        size_t copysize = oldsize - SIZE_SZ;
        size_t* s = (size_t*)oldp->memory();
        size_t* d = (size_t*)newmem;
        size_t ncopies = copysize / sizeof(size_t);
        assert(ncopies >= 3);

        if (ncopies > 9) {
          memcpy(d, s, copysize);
        } else {
          d[0] = s[0];
          d[1] = s[1];
          d[2] = s[2];
          if (ncopies > 4) {
            d[3] = s[3];
            d[4] = s[4];
            if (ncopies > 6) {
              d[5] = s[5];
              d[6] = s[6];
              if (ncopies > 8) {
                d[7] = s[7];
                d[8] = s[8];
              }
            }
          }
        }

        free(oldp);
        check_inuse_chunk(newp);
        return newp->memory();
      }
    }
  }

  // If possible, free extra space in old or extended chunk
  assert(newsize >= nb);
  size_t remainder_size = newsize - nb;
  if (remainder_size < MINSIZE) {
    newp->set_head_size(newsize | (this != &main_arena ? NON_MAIN_ARENA : 0));
    newp->set_inuse_at_offset(newsize);
  } else {
    // split remainder
    malloc_chunk* remainder = newp->chunk_at_offset(nb);
    newp->set_head_size(nb | (this != &main_arena ? NON_MAIN_ARENA : 0));
    remainder->set_head(remainder_size | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
    // Mark remainder as inuse so free() won't complain
    remainder->set_inuse_at_offset(remainder_size);
    free(remainder);
  }

  check_inuse_chunk(newp);
  return newp->memory();
}

void* malloc_state::memalign(size_t alignment, size_t bytes) {
  size_t nb = request2size(bytes);
  if (nb < bytes || nb >= REQUEST_OUT_OF_RANGE) {
    // ENOMEM
    return nullptr;
  }

  // Strategy: find a spot within that chunk that meets the alignment
  // request, and then possibly free the leading and trailing space.

  // Check for overflow.
  if (nb > SIZE_MAX - alignment - MINSIZE) {
    // ENOMEM
    return nullptr;
  }

  // Call malloc with worst case padding to hit alignment.
  char* m = (char*)malloc(nb + alignment + MINSIZE);
  if (m == nullptr) {
    // propagate failure
    return nullptr;
  }

  malloc_chunk* p = malloc_chunk::from_mem(m);
  if (((size_t)m % alignment) != 0) {
    // Find an aligned spot inside chunk.  Since we need to give back
    // leading space in a chunk of at least MINSIZE, if the first
    // calculation places us at a spot with less than MINSIZE leader,
    // we can move to the next aligned spot -- we've allocated enough
    // total room so that this is always possible.
    char* brk = (char*)malloc_chunk::from_mem((char*)((size_t)(m + alignment - 1) & ~(alignment - 1)));
    if ((size_t)(brk - (char*)p) < MINSIZE) {
      brk += alignment;
    }
    malloc_chunk* newp = (malloc_chunk*)brk;
    size_t leadsize = brk - (char*)p;
    size_t newsize = p->chunksize() - leadsize;

    // For mmapped chunks, just adjust offset
    if (p->is_mmapped()) {
      newp->set_prev_size(p->prev_size() + leadsize);
      newp->set_head(newsize | IS_MMAPPED);
      return newp->memory();
    }

    // Otherwise, give back leader, use the rest
    newp->set_head(newsize | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
    newp->set_inuse_at_offset(newsize);
    p->set_head_size(leadsize | (this != &main_arena ? NON_MAIN_ARENA : 0));
    free(p);
    p = newp;

    assert(newsize >= nb && ((size_t)p->memory() % alignment) == 0);
  }

  // Also give back spare room at the end
  if (!p->is_mmapped()) {
    size_t size = p->chunksize();
    if (size > nb + MINSIZE) {
      size_t remainder_size = size - nb;
      malloc_chunk* remainder = p->chunk_at_offset(nb);
      remainder->set_head(remainder_size | PREV_INUSE | (this != &main_arena ? NON_MAIN_ARENA : 0));
      p->set_head_size(nb);
      free(remainder);
    }
  }

  check_inuse_chunk(p);
  return p->memory();
}

}
