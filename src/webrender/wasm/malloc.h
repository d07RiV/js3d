#pragma once
#include "common.h"

namespace _mem {
  void* malloc(size_t bytes);
  void free(void* mem);
  void* realloc(void* oldmem, size_t bytes);
  void* memalign(size_t alignment, size_t bytes);
  void* valloc(size_t bytes);
  void* pvalloc(size_t bytes);
  void* calloc(size_t n, size_t elem_size);
}
