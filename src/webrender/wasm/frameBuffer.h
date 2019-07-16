#pragma once
#include "webgl.h"

namespace WebGL
{

class FrameBuffer : public Object<FrameBuffer> {
public:
  static FrameBuffer* create(GLenum format, size_t width, size_t height, size_t samples = 1) {
    FrameBuffer* buffer = new FrameBuffer;
    glCreateFramebuffer(buffer);
    WebGL::bindFrameBuffer(GL_FRAMEBUFFER, buffer);
    return buffer;
  }
  ~FrameBuffer();

  bool checkStatus() {
    WebGL::bindFrameBuffer(GL_FRAMEBUFFER, this);
    return glCheckFramebufferStatus(GL_FRAMEBUFFER);
  }

  GLptr getAttachment(GLenum attachment);
  int getAttachmentParameter(GLenum attachment, GLenum pname) {
    WebGL::bindFrameBuffer(GL_FRAMEBUFFER, this);
    return glGetFramebufferAttachmentParameter(GL_FRAMEBUFFER, attachment, pname);
  }

  void renderBuffer(GLenum attachment, RenderBuffer* renderBuffer);
  void texture2D(GLenum attachment, Texture* texture, GLenum target = GL_TEXTURE_2D, int level = 0);
  void textureLayer(GLenum attachment, Texture* texture, int layer, int level = 0);

  void blit(FrameBuffer* from, int srcX0, int srcY0, int srcX1, int srcY1,
            int dstX0, int dstY0, int dstX1, int dstY1,
            GLenum mask = GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT,
            GLenum filter = GL_NEAREST) {
    WebGL::bindFrameBuffer(GL_DRAW_FRAMEBUFFER, this);
    WebGL::bindFrameBuffer(GL_READ_FRAMEBUFFER, from);
    glBlitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, mask, filter);
  }

  void invalidate();
  void invalidateRect(int x, int y, size_t width, size_t height);

  void readPixels(GLenum attachment, int x, int y, size_t width, size_t height, GLenum format, GLenum type, void* pixels);
  void readPixelsBuffer(GLenum attachment, int x, int y, size_t width, size_t height, GLenum format, GLenum type, Buffer* buffer, size_t offset = 0);

  void onBind(GLenum target);

private:
  FrameBuffer() {}
  enum {
    NUM_ATTACHMENTS = 19,
  };
  ui32 dirtyFlags_ = 0;
  struct Attachment {
    GLptr object = nullptr;
    GLenum target;
    int layer;
    int level;
  };
  Attachment attachments_[NUM_ATTACHMENTS];
  GLenum readBuffer_ = GL_COLOR_ATTACHMENT0;

  GLenum isCurrent_() const;
};

}
