#pragma once

class SizedPool {
public:
  SizedPool(size_t blockSize, size_t pageSize = 65536);
  void* alloc();
  void free(void* ptr);
  void clear();
private:
  size_t blockSize_;
  size_t pageSize_;
  void* firstPage_ = nullptr;
  void* curPage_ = nullptr;
  size_t pageOffset_ = 0;
  void* freeBlock_ = nullptr;
};

template<size_t blockSize>
class SizedAllocator {
public:
  static void* alloc() {
    return pool_.alloc();
  }
  static void free(void* ptr) {
    pool_.free(ptr);
  }
private:
  static SizedPool pool_;
};
template<size_t blockSize>
SizedPool SizedAllocator<blockSize>::pool_(blockSize);
