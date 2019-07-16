#include "texture.h"

static inline size_t max(size_t a, size_t b) {
  return a > b ? a : b;
}

static size_t getLevels(size_t width) {
  size_t levels = 1;
  while (width > 1) {
    levels += 1;
    width >>= 1;
  }
  return levels;
}

static size_t getCompressedSize(GLenum internalFormat, size_t width, size_t height) {
  switch (internalFormat) {
  case GL_COMPRESSED_RGB_S3TC_DXT1:
  case GL_COMPRESSED_RGBA_S3TC_DXT1:
  case GL_COMPRESSED_SRGB_S3TC_DXT1:
  case GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT1:
  case GL_COMPRESSED_R11_EAC:
  case GL_COMPRESSED_SIGNED_R11_EAC:
  case GL_COMPRESSED_RGB8_ETC2:
  case GL_COMPRESSED_SRGB8_ETC2:
  case GL_COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2:
  case GL_COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2:
  case GL_COMPRESSED_RGB_ETC1:
  case GL_COMPRESSED_RGB_ATC:
    return ((width + 3) / 4) * ((height + 3) / 4) * 8;
  case GL_COMPRESSED_RGBA_S3TC_DXT3:
  case GL_COMPRESSED_RGBA_S3TC_DXT5:
  case GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT3:
  case GL_COMPRESSED_SRGB_ALPHA_S3TC_DXT5:
  case GL_COMPRESSED_RG11_EAC:
  case GL_COMPRESSED_SIGNED_RG11_EAC:
  case GL_COMPRESSED_RGBA8_ETC2_EAC:
  case GL_COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:
  case GL_COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA:
  case GL_COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA:
    return ((width + 3) / 4) * ((height + 3) / 4) * 16;
  case GL_COMPRESSED_RGB_PVRTC_4BPPV1_IMG:
  case GL_COMPRESSED_RGBA_PVRTC_4BPPV1_IMG:
    return max(width, 8) * max(height, 8) / 2;
  case GL_COMPRESSED_RGB_PVRTC_2BPPV1_IMG:
  case GL_COMPRESSED_RGBA_PVRTC_2BPPV1_IMG:
    return max(width, 16) * max(height, 8) / 4;
  case GL_COMPRESSED_RGBA_ASTC_4x4:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_4x4:
    return ((width + 3) / 4) * ((height + 3) / 4) * 16;
  case GL_COMPRESSED_RGBA_ASTC_5x4:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x4:
    return ((width + 4) / 5) * ((height + 3) / 4) * 16;
  case GL_COMPRESSED_RGBA_ASTC_5x5:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_5x5:
    return ((width + 4) / 5) * ((height + 4) / 5) * 16;
  case GL_COMPRESSED_RGBA_ASTC_6x5:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x5:
    return ((width + 5) / 6) * ((height + 4) / 5) * 16;
  case GL_COMPRESSED_RGBA_ASTC_6x6:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_6x6:
    return ((width + 5) / 6) * ((height + 5) / 6) * 16;
  case GL_COMPRESSED_RGBA_ASTC_8x5:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x5:
    return ((width + 7) / 8) * ((height + 4) / 5) * 16;
  case GL_COMPRESSED_RGBA_ASTC_8x6:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x6:
    return ((width + 7) / 8) * ((height + 5) / 6) * 16;
  case GL_COMPRESSED_RGBA_ASTC_8x8:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_8x8:
    return ((width + 7) / 8) * ((height + 7) / 8) * 16;
  case GL_COMPRESSED_RGBA_ASTC_10x5:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x5:
    return ((width + 9) / 10) * ((height + 4) / 5) * 16;
  case GL_COMPRESSED_RGBA_ASTC_10x6:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x6:
    return ((width + 9) / 10) * ((height + 5) / 6) * 16;
  case GL_COMPRESSED_RGBA_ASTC_10x8:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x8:
    return ((width + 9) / 10) * ((height + 7) / 8) * 16;
  case GL_COMPRESSED_RGBA_ASTC_10x10:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_10x10:
    return ((width + 9) / 10) * ((height + 9) / 10) * 16;
  case GL_COMPRESSED_RGBA_ASTC_12x10:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x10:
    return ((width + 11) / 12) * ((height + 9) / 10) * 16;
  case GL_COMPRESSED_RGBA_ASTC_12x12:
  case GL_COMPRESSED_SRGB8_ALPHA8_ASTC_12x12:
    return ((width + 11) / 12) * ((height + 11) / 12) * 16;

  default:
    return 0;
  }
}

namespace WebGL
{

Texture* Texture::create2D(GLenum format, size_t width, size_t height, size_t levels) {
  Texture* texture = new Texture;
  glCreateTexture(texture);
  glBindTexture(GL_TEXTURE_2D, texture);
  if (levels == 0) {
    levels = getLevels(max(width, height));
  }
  texture->target_ = GL_TEXTURE_2D;
  texture->format_ = format;
  texture->width_ = width;
  texture->height_ = height;
  texture->depth_ = 0;
  texture->levels_ = levels;

  if (WebGL::version() >= 2) {
    glTexStorage2D(GL_TEXTURE_2D, levels, format, width, height);
  } else {
    size_t compressed = getCompressedSize(format, width, height);
    if (compressed == 0) {
      for (size_t i = 0; i < levels; ++i) {
        glTexImage2D(GL_TEXTURE_2D, i, format, width, height, 0, format, GL_UNSIGNED_BYTE, nullptr);
        width = max(width >> 1, 1);
        height = max(height >> 1, 1);
      }
    } else {
      void* ptr = sbrk(compressed);
      for (size_t i = 0; i < levels; ++i) {
        glCompressedTexImage2D(GL_TEXTURE_2D, i, format, width, height, 0, compressed, ptr);
        width = max(width >> 1, 1);
        height = max(height >> 1, 1);
        compressed = getCompressedSize(format, width, height);
      }
      sbrk(-compressed);
    }
  }

  return texture;
}

static GLenum CubeFaces[6] = {
  GL_TEXTURE_CUBE_MAP_POSITIVE_X,
  GL_TEXTURE_CUBE_MAP_NEGATIVE_X,
  GL_TEXTURE_CUBE_MAP_POSITIVE_Y,
  GL_TEXTURE_CUBE_MAP_NEGATIVE_Y,
  GL_TEXTURE_CUBE_MAP_POSITIVE_Z,
  GL_TEXTURE_CUBE_MAP_NEGATIVE_Z
};

Texture* Texture::createCube(GLenum format, size_t width, size_t height, size_t levels) {
  Texture* texture = new Texture;
  glCreateTexture(texture);
  glBindTexture(GL_TEXTURE_CUBE_MAP, texture);
  if (levels == 0) {
    levels = getLevels(max(width, height));
  }
  texture->target_ = GL_TEXTURE_CUBE_MAP;
  texture->format_ = format;
  texture->width_ = width;
  texture->height_ = height;
  texture->depth_ = 0;
  texture->levels_ = levels;

  if (WebGL::version() >= 2) {
    glTexStorage2D(GL_TEXTURE_CUBE_MAP, levels, format, width, height);
  } else {
    size_t compressed = getCompressedSize(format, width, height);
    if (compressed == 0) {
      for (size_t i = 0; i < levels; ++i) {
        for (int j = 0; j < 6; ++j) {
          glTexImage2D(CubeFaces[j], i, format, width, height, 0, format, GL_UNSIGNED_BYTE, nullptr);
        }
        width = max(width >> 1, 1);
        height = max(height >> 1, 1);
      }
    } else {
      void* ptr = sbrk(compressed);
      for (size_t i = 0; i < levels; ++i) {
        for (int j = 0; j < 6; ++j) {
          glCompressedTexImage2D(CubeFaces[j], i, format, width, height, 0, compressed, ptr);
        }
        width = max(width >> 1, 1);
        height = max(height >> 1, 1);
        compressed = getCompressedSize(format, width, height);
      }
      sbrk(-compressed);
    }
  }

  return texture;
}

Texture* Texture::create3D(GLenum format, size_t width, size_t height, size_t depth, size_t levels) {
  Texture* texture = new Texture;
  glCreateTexture(texture);
  glBindTexture(GL_TEXTURE_3D, texture);
  if (levels == 0) {
    levels = getLevels(max(width, max(height, depth)));
  }
  texture->target_ = GL_TEXTURE_3D;
  texture->format_ = format;
  texture->width_ = width;
  texture->height_ = height;
  texture->depth_ = depth;
  texture->levels_ = levels;

  glTexStorage3D(GL_TEXTURE_3D, levels, format, width, height, depth);

  return texture;
}

Texture* Texture::create2DArray(GLenum format, size_t width, size_t height, size_t layers, size_t levels) {
  Texture* texture = new Texture;
  glCreateTexture(texture);
  glBindTexture(GL_TEXTURE_2D_ARRAY, texture);
  if (levels == 0) {
    levels = getLevels(max(width, height));
  }
  texture->target_ = GL_TEXTURE_2D_ARRAY;
  texture->format_ = format;
  texture->width_ = width;
  texture->height_ = height;
  texture->depth_ = layers;
  texture->levels_ = levels;

  glTexStorage3D(GL_TEXTURE_2D_ARRAY, levels, format, width, height, layers);

  return texture;
}

void Texture::subImage2D(int x, int y, size_t width, size_t height, GLenum format, GLenum type, const void* data, int level, GLenum target) {
  WebGL::bindTexture(target, this);
  if (WebGL::version() >= 2) {
    WebGL::bindBuffer(GL_PIXEL_UNPACK_BUFFER, nullptr);
  }
  glTexSubImage2D(target, level, x, y, width, height, format, type, data);
}
void Texture::subImage3D(int x, int y, int z, size_t width, size_t height, size_t depth, GLenum format, GLenum type, const void* data, int level) {
  WebGL::bindTexture(target_, this);
  if (WebGL::version() >= 2) {
    WebGL::bindBuffer(GL_PIXEL_UNPACK_BUFFER, nullptr);
  }
  glTexSubImage3D(target_, level, x, y, z, width, height, depth, format, type, data);
}

void Texture::subImage2DBuffer(int x, int y, size_t width, size_t height, GLenum format, GLenum type, Buffer* buffer, size_t offset, int level, GLenum target) {
  WebGL::bindTexture(target, this);
  WebGL::bindBuffer(GL_PIXEL_UNPACK_BUFFER, buffer);
  glTexSubImage2DBuffer(target, level, x, y, width, height, format, type, offset);
}
void Texture::subImage3DBuffer(int x, int y, int z, size_t width, size_t height, size_t depth, GLenum format, GLenum type, Buffer* buffer, size_t offset, int level) {
  WebGL::bindTexture(target_, this);
  WebGL::bindBuffer(GL_PIXEL_UNPACK_BUFFER, buffer);
  glTexSubImage3DBuffer(target_, level, x, y, z, width, height, depth, format, type, offset);
}

void Texture::copySubImage2D(int dstX, int dstY, int srcX, int srcY, size_t width, size_t height, FrameBuffer* frameBuffer, int level, GLenum target) {
  WebGL::bindTexture(target_, this);
  WebGL::bindFrameBuffer(GL_FRAMEBUFFER, frameBuffer);
  glCopyTexSubImage2D(target, level, dstX, dstY, srcX, srcY, width, height);
}

void Texture::setMagFilter(GLenum value) {
  if (value != magFilter_) {
    magFilter_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_MAG_FILTER, value);
    } else {
      dirtyFlags_ |= fMAG_FILTER;
    }
  }
}
void Texture::setMinFilter(GLenum value) {
  if (value != minFilter_) {
    minFilter_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_MIN_FILTER, value);
    } else {
      dirtyFlags_ |= fMIN_FILTER;
    }
  }
}
void Texture::setBaseLevel(int value) {
  if (value != baseLevel_) {
    baseLevel_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_BASE_LEVEL, value);
    } else {
      dirtyFlags_ |= fBASE_LEVEL;
    }
  }
}
void Texture::setMaxLevel(int value) {
  if (value != maxLevel_) {
    maxLevel_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_MAX_LEVEL, value);
    } else {
      dirtyFlags_ |= fMAX_LEVEL;
    }
  }
}
void Texture::setWrapS(GLenum value) {
  if (value != wrapS_) {
    wrapS_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_WRAP_S, value);
    } else {
      dirtyFlags_ |= fWRAP_S;
    }
  }
}
void Texture::setWrapT(GLenum value) {
  if (value != wrapT_) {
    wrapT_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_WRAP_T, value);
    } else {
      dirtyFlags_ |= fWRAP_T;
    }
  }
}
void Texture::setWrapR(GLenum value) {
  if (value != wrapR_) {
    wrapR_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_WRAP_R, value);
    } else {
      dirtyFlags_ |= fWRAP_R;
    }
  }
}
void Texture::setCompareFunc(GLenum value) {
  if (value != compareFunc_) {
    compareFunc_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_COMPARE_FUNC, value);
    } else {
      dirtyFlags_ |= fCOMPARE_FUNC;
    }
  }
}
void Texture::setCompareMode(GLenum value) {
  if (value != compareMode_) {
    compareMode_ = value;
    if (isCurrent_()) {
      glTexParameteri(target_, GL_TEXTURE_COMPARE_MODE, value);
    } else {
      dirtyFlags_ |= fCOMPARE_MODE;
    }
  }
}
void Texture::setMinLod(float value) {
  if (value != minLod_) {
    minLod_ = value;
    if (isCurrent_()) {
      glTexParameterf(target_, GL_TEXTURE_MIN_LOD, value);
    } else {
      dirtyFlags_ |= fMIN_LOD;
    }
  }
}
void Texture::setMaxLod(float value) {
  if (value != maxLod_) {
    maxLod_ = value;
    if (isCurrent_()) {
      glTexParameterf(target_, GL_TEXTURE_MAX_LOD, value);
    } else {
      dirtyFlags_ |= fMAX_LOD;
    }
  }
}
void Texture::setMaxAnisotropy(float value) {
  if (value != maxAnisotropy_) {
    maxAnisotropy_ = value;
    if (isCurrent_()) {
      glTexParameterf(target_, GL_TEXTURE_MAX_ANISOTROPY, value);
    } else {
      dirtyFlags_ |= fMAX_ANISOTROPY;
    }
  }
}

bool Texture::isCurrent_() const {
  return WebGL::getTextureBinding(target_);
}

void Texture::onBind(GLenum target) {
  glBindTexture(target, this);
  if (dirtyFlags_) {
    if (dirtyFlags_ & fMAG_FILTER) {
      glTexParameteri(target_, GL_TEXTURE_MAG_FILTER, magFilter_);
    }
    if (dirtyFlags_ & fMIN_FILTER) {
      glTexParameteri(target_, GL_TEXTURE_MIN_FILTER, minFilter_);
    }
    if (dirtyFlags_ & fBASE_LEVEL) {
      glTexParameteri(target_, GL_TEXTURE_BASE_LEVEL, baseLevel_);
    }
    if (dirtyFlags_ & fMAX_LEVEL) {
      glTexParameteri(target_, GL_TEXTURE_MAX_LEVEL, maxLevel_);
    }
    if (dirtyFlags_ & fWRAP_S) {
      glTexParameteri(target_, GL_TEXTURE_WRAP_S, wrapS_);
    }
    if (dirtyFlags_ & fWRAP_T) {
      glTexParameteri(target_, GL_TEXTURE_WRAP_T, wrapT_);
    }
    if (dirtyFlags_ & fWRAP_R) {
      glTexParameteri(target_, GL_TEXTURE_WRAP_R, wrapR_);
    }
    if (dirtyFlags_ & fCOMPARE_FUNC) {
      glTexParameteri(target_, GL_TEXTURE_COMPARE_FUNC, compareFunc_);
    }
    if (dirtyFlags_ & fCOMPARE_MODE) {
      glTexParameteri(target_, GL_TEXTURE_COMPARE_MODE, compareMode_);
    }
    if (dirtyFlags_ & fMIN_LOD) {
      glTexParameterf(target_, GL_TEXTURE_MIN_LOD, minLod_);
    }
    if (dirtyFlags_ & fMAX_LOD) {
      glTexParameterf(target_, GL_TEXTURE_MAX_LOD, maxLod_);
    }
    if (dirtyFlags_ & fMAX_ANISOTROPY) {
      glTexParameterf(target_, GL_TEXTURE_MAX_ANISOTROPY, maxAnisotropy_);
    }
    dirtyFlags_ = 0;
  }
}

}
