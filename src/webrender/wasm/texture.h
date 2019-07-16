#pragma once
#include "webgl.h"

namespace WebGL
{

class Texture : public Object<Texture> {
public:
  static Texture* create2D(GLenum format, size_t width, size_t height, size_t levels = 1);
  static Texture* createCube(GLenum format, size_t width, size_t height, size_t levels = 1);
  static Texture* create3D(GLenum format, size_t width, size_t height, size_t depth, size_t levels = 1);
  static Texture* create2DArray(GLenum format, size_t width, size_t height, size_t layers, size_t levels = 1);

  ~Texture() {
    glDeleteTexture(this);
  }

  GLenum target() const {
    return target_;
  }
  GLenum format() const {
    return format_;
  }
  size_t width() const {
    return width_;
  }
  size_t height() const {
    return height_;
  }
  size_t depth() const {
    return depth_;
  }
  size_t layers() const {
    return depth_;
  }
  size_t levels() const {
    return levels_;
  }

  void image2D(GLenum format, GLenum type, const void* data, int level = 0, GLenum target = GL_TEXTURE_2D) {
    subImage2D(0, 0, width_, height_, format, type, data, level, target);
  }
  void image3D(GLenum format, GLenum type, const void* data, int level = 0) {
    subImage3D(0, 0, 0, width_, height_, depth_, format, type, data, level);
  }
  void subImage2D(int x, int y, size_t width, size_t height, GLenum format, GLenum type, const void* data, int level = 0, GLenum target = GL_TEXTURE_2D);
  void subImage3D(int x, int y, int z, size_t width, size_t height, size_t depth, GLenum format, GLenum type, const void* data, int level = 0);

  void image2DBuffer(GLenum format, GLenum type, Buffer* buffer, size_t offset = 0, int level = 0, GLenum target = GL_TEXTURE_2D) {
    subImage2DBuffer(0, 0, width_, height_, format, type, buffer, offset, level, target);
  }
  void image3DBuffer(GLenum format, GLenum type, Buffer* buffer, size_t offset = 0, int level = 0) {
    subImage3DBuffer(0, 0, 0, width_, height_, depth_, format, type, buffer, offset, level);
  }
  void subImage2DBuffer(int x, int y, size_t width, size_t height, GLenum format, GLenum type, Buffer* buffer, size_t offset = 0, int level = 0, GLenum target = GL_TEXTURE_2D);
  void subImage3DBuffer(int x, int y, int z, size_t width, size_t height, size_t depth, GLenum format, GLenum type, Buffer* buffer, size_t offset = 0, int level = 0);

  void copyImage2D(FrameBuffer* frameBuffer, int level = 0, GLenum target = GL_TEXTURE_2D) {
    copySubImage2D(0, 0, 0, 0, width_, height_, frameBuffer, level, target);
  }
  void copySubImage2D(int dstX, int dstY, int srcX, int srcY, size_t width, size_t height, FrameBuffer* frameBuffer, int level = 0, GLenum target = GL_TEXTURE_2D);

  void generateMipmap() {
    WebGL::bindTexture(target_, this);
    glGenerateMipmap(target_);
  }

  GLenum magFilter() const {
    return magFilter_;
  }
  GLenum minFilter() const {
    return minFilter_;
  }
  int baseLevel() const {
    return baseLevel_;
  }
  int maxLevel() const {
    return maxLevel_;
  }
  GLenum wrapS() const {
    return wrapS_;
  }
  GLenum wrapT() const {
    return wrapT_;
  }
  GLenum wrapR() const {
    return wrapR_;
  }
  GLenum compareFunc() const {
    return compareFunc_;
  }
  GLenum compareMode() const {
    return compareMode_;
  }
  float minLod() const {
    return minLod_;
  }
  float maxLod() const {
    return maxLod_;
  }
  float maxAnisotropy() const {
    return maxAnisotropy_;
  }

  void setMagFilter(GLenum value);
  void setMinFilter(GLenum value);
  void setBaseLevel(int value);
  void setMaxLevel(int value);
  void setWrapS(GLenum value);
  void setWrapT(GLenum value);
  void setWrapR(GLenum value);
  void setCompareFunc(GLenum value);
  void setCompareMode(GLenum value);
  void setMinLod(float value);
  void setMaxLod(float value);
  void setMaxAnisotropy(float value);

  void setFilter(GLenum min, GLenum mag) {
    setMinFilter(min);
    setMagFilter(mag);
  }
  void setLevel(int base, int max) {
    setBaseLevel(base);
    setMaxLevel(max);
  }
  void setWrap(GLenum s, GLenum t, GLenum r = GL_REPEAT) {
    setWrapS(s);
    setWrapT(t);
    setWrapR(r);
  }
  void setCompare(GLenum mode, GLenum func = GL_LEQUAL) {
    setCompareMode(mode);
    setCompareFunc(func);
  }
  void setLod(float min, float max) {
    setMinLod(min);
    setMaxLod(max);
  }

  void onBind(GLenum target);

private:
  Texture() {}
  GLenum target_;
  GLenum format_;
  size_t width_;
  size_t height_;
  size_t depth_;
  size_t levels_;

  enum {
    fMAG_FILTER           = 0x0001,
    fMIN_FILTER           = 0x0002,
    fBASE_LEVEL           = 0x0004,
    fMAX_LEVEL            = 0x0008,
    fWRAP_S               = 0x0010,
    fWRAP_T               = 0x0020,
    fWRAP_R               = 0x0040,
    fCOMPARE_FUNC         = 0x0100,
    fCOMPARE_MODE         = 0x0200,
    fMIN_LOD              = 0x0400,
    fMAX_LOD              = 0x0800,
    fMAX_ANISOTROPY       = 0x1000,
  };
  ui32 dirtyFlags_ = 0;
  GLenum magFilter_ = GL_LINEAR;
  GLenum minFilter_ = GL_NEAREST_MIPMAP_LINEAR;
  int baseLevel_ = 0;
  int maxLevel_ = 1000;
  GLenum wrapS_ = GL_REPEAT;
  GLenum wrapT_ = GL_REPEAT;
  GLenum wrapR_ = GL_REPEAT;
  GLenum compareFunc_ = GL_LEQUAL;
  GLenum compareMode_ = GL_NONE;
  float minLod_ = -1000.0f;
  float maxLod_ = 1000.0f;
  float maxAnisotropy_ = 1.0f;

  bool isCurrent_() const;
};

}
