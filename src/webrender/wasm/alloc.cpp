#include "alloc.h"

static const size_t PTRSIZE = sizeof(void*);

SizedPool::SizedPool(size_t blockSize, size_t pageSize = 65536)
  : blockSize_(blockSize < PTRSIZE ? PTRSIZE : blockSize)
  , pageSize_((pageSize - PTRSIZE) / blockSize * blockSize + PTRSIZE)
{
  if (pageSize_ < PTRSIZE + blockSize_) {
    pageSize_ = blockSize_ + PTRSIZE;
  }
}
void* SizedPool::alloc() {
  if (freeBlock_) {
    void* result = freeBlock_;
    freeBlock_ = *(void**)result;
    return result;
  } else if (curPage_ && pageOffset_ + blockSize_ <= pageSize_) {
    void* result = (char*)curPage_ + pageOffset_;
    pageOffset_ += blockSize_;
    return result;
  } else if (curPage_ && *(void**)curPage_) {
    curPage_ = *(void**)curPage_;
    pageOffset_ = PTRSIZE + blockSize_;
    return (char*)curPage_ + PTRSIZE;
  } else {
    void* page = sbrk(pageSize_);
    if (curPage_) {
      *(void**)curPage_ = page;
    } else {
      firstPage_ = page;
    }
    curPage_ = page;
    pageOffset_ = PTRSIZE + blockSize_;
    return (char*)curPage_ + PTRSIZE;
  }
}
void SizedPool::free(void* ptr) {
  *(void**)ptr = freeBlock_;
  freeBlock_ = ptr;
}
void SizedPool::clear() {
  curPage_ = firstPage_;
  pageOffset_ = PTRSIZE;
  freeBlock_ = nullptr;
}
