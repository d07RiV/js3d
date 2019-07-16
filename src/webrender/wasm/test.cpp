#include <Windows.h>
#include <Psapi.h>
#include <stdio.h>
//#include <memory.h>
#include "malloc.h"
#include <stdlib.h>

typedef unsigned __int64 u64;
typedef unsigned long u32;

struct perf_info {
  u64 time;
  u32 memory;
  u32 max_memory;
};

u64 ft2u(const FILETIME& ft) {
  return (u64(ft.dwHighDateTime) << 32) + u64(ft.dwLowDateTime);
}

perf_info get_perf() {
  HANDLE hProcess = GetCurrentProcess();
  perf_info info;

  FILETIME tCreation, tExit, tKernel, tUser;
  GetProcessTimes(hProcess, &tCreation, &tExit, &tKernel, &tUser);
  info.time = ft2u(tKernel) + ft2u(tUser);

  PROCESS_MEMORY_COUNTERS pmc;
  GetProcessMemoryInfo(hProcess, &pmc, sizeof pmc);

  info.memory = pmc.WorkingSetSize;
  info.max_memory = pmc.PeakWorkingSetSize;

  return info;
}

const int NUM_ALLOCS = 65536 * 4;
const int MIN_SIZE = 32;
const int MED_SIZE = 256;
const int MAX_SIZE = 65536;
void* memp[NUM_ALLOCS];

u32 max_mem = 0;
char* mem0;

void test() {
  int cur = 0;
  for (int i = 0; i < NUM_ALLOCS * 2; ++i) {
    int rem = NUM_ALLOCS * 2 - i;
    int r0 = rand();
    if ((r0 % rem) < cur) {
      int pos = rand() % cur;
      _mem::free(memp[pos]);
      memp[pos] = memp[--cur];
    } else {
      int r1 = rand();
      int sz = (r0 & 1 ? r1 % (MED_SIZE - MIN_SIZE) + MIN_SIZE : r1 % (MAX_SIZE - MED_SIZE) + MED_SIZE);
      memp[cur++] = _mem::malloc(sz);
    }
    u32 cur_mem = (char*)sbrk(0) - mem0;
    if (cur_mem > max_mem) max_mem = cur_mem;
  }
}

int main() {
  mem0 = (char*)sbrk(0);
  test();
  perf_info p = get_perf();
  p.max_memory = max_mem;
  printf("CPU: %I64d MEM: %d PEAK: %d\n", p.time, p.memory, p.max_memory);
  return 0;
}
