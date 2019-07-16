#pragma once

typedef long i32;
typedef unsigned long ui32;
typedef float f32;
typedef double f64;

typedef unsigned long size_t;
typedef signed long ptrdiff_t;

static const size_t dl_pagesize = 65536;

void* sbrk(ptrdiff_t);
void error(const char* message) __attribute__((noreturn));
void* memset(void* ptr, int value, size_t num);
void* memcpy(void* destination, const void* source, size_t num);

#ifdef NDEBUG
#define assert(x) do{(void)sizeof(x);}while(0)
#else
#define X2S(x) #x
#define I2S(x) X2S(x)
#define assert(x) do{if (!(x)) { error("assertion failed: " #x " file " __FILE__ " line " I2S(__LINE__)); }}while(0)
#endif
#define __builtin_expect(x,y) (x)
#define __builtin_unreachable() 0
