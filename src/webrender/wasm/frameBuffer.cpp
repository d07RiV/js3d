#include "frameBuffer.h"
#include "renderBuffer.h"
#include "texture.h"

static int getAttachmentSlot(GLenum attachment) {
  switch (attachment) {
  case GL_DEPTH_ATTACHMENT:
    return 0;
  case GL_STENCIL_ATTACHMENT:
    return 1;
  case GL_DEPTH_STENCIL_ATTACHMENT:
    return 2;
  default:
    return 3 + attachment - GL_COLOR_ATTACHMENT0;
  }
}
static GLenum getSlotAttachment(int slot) {
  switch (slot) {
  case 0:
    return GL_DEPTH_ATTACHMENT;
  case 1:
    return GL_STENCIL_ATTACHMENT;
  case 2:
    return GL_DEPTH_STENCIL_ATTACHMENT;
  default:
    return GL_COLOR_ATTACHMENT0 + (slot - 3);
  }
}

namespace WebGL
{

FrameBuffer::~FrameBuffer() {
  for (int i = 0; i < NUM_ATTACHMENTS; ++i) {
    if (attachments_[i].object) {
      attachments_[i].object->release();
    }
  }
}

GLptr FrameBuffer::getAttachment(GLenum attachment) {
  return attachments_[getAttachmentSlot(attachment)].object;
}

void FrameBuffer::renderBuffer(GLenum attachment, RenderBuffer* renderBuffer) {
  int slot = getAttachmentSlot(attachment);
  Attachment& info = attachments_[slot];
  if (info.object != renderBuffer || info.target != GL_RENDERBUFFER) {
    if (renderBuffer) {
      renderBuffer->addref();
    }
    if (info.object) {
      info.object->release();
    }
    info.object = renderBuffer;
    info.target = GL_RENDERBUFFER;
    GLenum current = isCurrent_();
    if (current) {
      glFramebufferRenderbuffer(current, attachment, GL_RENDERBUFFER, renderBuffer);
    } else {
      dirtyFlags_ |= (1 << slot);
    }
  }
}

void FrameBuffer::texture2D(GLenum attachment, Texture* texture, GLenum target, int level) {
  int slot = getAttachmentSlot(attachment);
  Attachment& info = attachments_[slot];
  if (info.object != texture || info.target != target || info.level != level) {
    if (texture) {
      texture->addref();
    }
    if (info.object) {
      info.object->release();
    }
    info.object = texture;
    info.target = target;
    info.level = level;
    GLenum current = isCurrent_();
    if (current) {
      glFramebufferTexture2D(current, attachment, target, texture, level);
    } else {
      dirtyFlags_ |= (1 << slot);
    }
  }
}

void FrameBuffer::textureLayer(GLenum attachment, Texture* texture, int layer, int level = 0) {
  int slot = getAttachmentSlot(attachment);
  Attachment& info = attachments_[slot];
  if (info.object != texture || info.target != GL_TEXTURE_2D_ARRAY || info.layer != layer || info.level != level) {
    if (texture) {
      texture->addref();
    }
    if (info.object) {
      info.object->release();
    }
    info.object = texture;
    info.target = GL_TEXTURE_2D_ARRAY;
    info.layer = layer;
    info.level = level;
    GLenum current = isCurrent_();
    if (current) {
      glFramebufferTextureLayer(current, attachment, texture, level, layer);
    } else {
      dirtyFlags_ |= (1 << slot);
    }
  }
}

GLenum FrameBuffer::isCurrent_() const {
  if (WebGL::getFrameBufferBinding(GL_FRAMEBUFFER) == this) {
    return GL_FRAMEBUFFER;
  } else if (WebGL::getFrameBufferBinding(GL_READ_FRAMEBUFFER) == this) {
    return GL_READ_FRAMEBUFFER;
  } else {
    return 0;
  }
}

void FrameBuffer::onBind(GLenum target) {
  glBindFramebuffer(target, this);
  if (dirtyFlags_) {
    for (int i = 0; i < NUM_ATTACHMENTS; ++i) {
      if (dirtyFlags_ & (1 << i)) {
        GLenum attachment = getSlotAttachment(i);
        Attachment& info = attachments_[i];
        if (info.target == GL_RENDERBUFFER) {
          glFramebufferRenderbuffer(target, attachment, GL_RENDERBUFFER, info.object);
        } else if (info.target == GL_TEXTURE_2D_ARRAY) {
          glFramebufferTextureLayer(target, attachment, info.object, info.level, info.layer);
        } else {
          glFramebufferTexture2D(target, attachment, info.target, info.object, info.level);
        }
      }
    }
    dirtyFlags_ = 0;
  }
}

void FrameBuffer::invalidate() {
  GLenum attachments[NUM_ATTACHMENTS];
  size_t numAttachments = 0;
  for (int i = 0; i < NUM_ATTACHMENTS; ++i) {
    if (attachments_[i].object) {
      attachments[numAttachments++] = getSlotAttachment(i);
    }
  }
  WebGL::bindFrameBuffer(GL_FRAMEBUFFER, this);
  glInvalidateFramebuffer(GL_FRAMEBUFFER, numAttachments, attachments);
}
void FrameBuffer::invalidateRect(int x, int y, size_t width, size_t height) {
  GLenum attachments[NUM_ATTACHMENTS];
  size_t numAttachments = 0;
  for (int i = 0; i < NUM_ATTACHMENTS; ++i) {
    if (attachments_[i].object) {
      attachments[numAttachments++] = getSlotAttachment(i);
    }
  }
  WebGL::bindFrameBuffer(GL_FRAMEBUFFER, this);
  glInvalidateSubFramebuffer(GL_FRAMEBUFFER, numAttachments, attachments, x, y, width, height);
}

void FrameBuffer::readPixels(GLenum attachment, int x, int y, size_t width, size_t height, GLenum format, GLenum type, void* pixels) {
  WebGL::bindFrameBuffer(GL_FRAMEBUFFER, this);
  if (WebGL::version() >= 2) {
    WebGL::bindBuffer(GL_PIXEL_PACK_BUFFER, nullptr);
  }
  if (attachment != readBuffer_) {
    readBuffer_ = attachment;
    glReadBuffer(attachment);
  }
  glReadPixels(x, y, width, height, format, type, pixels);
}
void FrameBuffer::readPixelsBuffer(GLenum attachment, int x, int y, size_t width, size_t height, GLenum format, GLenum type, Buffer* buffer, size_t offset) {
  WebGL::bindFrameBuffer(GL_FRAMEBUFFER, this);
  WebGL::bindBuffer(GL_PIXEL_PACK_BUFFER, buffer);
  if (attachment != readBuffer_) {
    readBuffer_ = attachment;
    glReadBuffer(attachment);
  }
  glReadPixelsBuffer(x, y, width, height, format, type, offset);
}

}
