const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');

if (menuButton && navigation) {
  menuButton.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navigation.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

const contactDock = document.createElement('div');
contactDock.className = 'contact-dock';
contactDock.innerHTML = `
  <div class="contact-dock-inner">
    <span class="contact-dock-brand">Available for employment and freelance</span>
    <a class="contact-dock-link" href="https://www.linkedin.com/in/dusan-perunovic-6361a4122/" target="_blank" rel="noreferrer">Start a conversation</a>
  </div>
`;
document.body.appendChild(contactDock);

const defaultVideoVolume = 0.3;
const setDefaultVideoVolume = (video) => {
  if (!video || video.tagName?.toLowerCase() !== 'video') return;
  video.volume = defaultVideoVolume;
};

document.querySelectorAll('video').forEach(setDefaultVideoVolume);

const loadLazyVideo = (video, options = {}) => {
  if (!video?.dataset.lazySrc) return;

  const { play = true } = options;

  video.src = video.dataset.lazySrc;
  video.preload = 'metadata';
  delete video.dataset.lazySrc;
  setDefaultVideoVolume(video);
  video.load();

  if (video.autoplay && play) {
    video.play().catch(() => {});
  }
};

const aiMotionVideos = Array.from(document.querySelectorAll('.ai-projects .ai-video-card video'));
let activeAiMotionVideo = null;
let userSelectedAiMotionVideo = null;
const aiMotionVisibility = new Map();

aiMotionVideos.forEach((video) => {
  video.dataset.autoplayManaged = 'true';
});

const pauseAiMotionVideosExcept = (activeVideo) => {
  aiMotionVideos.forEach((video) => {
    if (video !== activeVideo) {
      video.pause();
    }
  });
};

const playAiMotionVideo = (video) => {
  if (!video) return;

  if (video.dataset.lazySrc) {
    loadLazyVideo(video, { play: false });
  }

  activeAiMotionVideo = video;
  pauseAiMotionVideosExcept(video);
  video.play().catch(() => {});
};

const selectVisibleAiMotionVideo = () => {
  if (!aiMotionVideos.length) return;

  const visibleVideo = aiMotionVideos.reduce((best, video) => {
    const ratio = aiMotionVisibility.get(video) || 0;
    const bestRatio = best ? aiMotionVisibility.get(best) || 0 : 0;
    return ratio > bestRatio ? video : best;
  }, null);

  if (!visibleVideo || (aiMotionVisibility.get(visibleVideo) || 0) <= 0.2) {
    pauseAiMotionVideosExcept(null);
    activeAiMotionVideo = null;
    return;
  }

  playAiMotionVideo(visibleVideo);
};

if (aiMotionVideos.length) {
  const aiMotionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        aiMotionVisibility.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      });

      if (!userSelectedAiMotionVideo) {
        selectVisibleAiMotionVideo();
      }
    },
    { rootMargin: '120px 0px', threshold: [0, 0.2, 0.55, 0.85] }
  );

  aiMotionVideos.forEach((video) => {
    const card = video.closest('.ai-video-card');

    aiMotionObserver.observe(video);

    card?.addEventListener('pointerenter', () => {
      userSelectedAiMotionVideo = video;
      playAiMotionVideo(video);
    });

    card?.addEventListener('pointerleave', () => {
      userSelectedAiMotionVideo = null;
      selectVisibleAiMotionVideo();
    });

    card?.addEventListener('focusin', () => {
      userSelectedAiMotionVideo = video;
      playAiMotionVideo(video);
    });

    card?.addEventListener('focusout', () => {
      userSelectedAiMotionVideo = null;
      selectVisibleAiMotionVideo();
    });
  });
}

const lazyVideos = document.querySelectorAll('video[data-lazy-src]:not([data-autoplay-managed])');

if (lazyVideos.length) {
  const lazyVideoObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        loadLazyVideo(entry.target);
        lazyVideoObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '520px 0px', threshold: 0.01 }
  );

  lazyVideos.forEach((video) => lazyVideoObserver.observe(video));
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const syncHomeNavSection = () => {
  if (!document.body.classList.contains('home-page') || !navigation) return;

  const aboutSection = document.querySelector('#about');
  const homeLink = navigation.querySelector('a[href="index.html"]');
  const aboutLink = navigation.querySelector('a[href="#about"]');
  if (!aboutSection || !homeLink || !aboutLink) return;

  const triggerPoint = Math.min(window.innerHeight * 0.36, 230);
  const aboutIsActive = aboutSection.getBoundingClientRect().top <= triggerPoint;

  navigation.querySelectorAll('a').forEach((link) => link.classList.remove('active'));
  (aboutIsActive ? aboutLink : homeLink).classList.add('active');
};

if (document.body.classList.contains('home-page')) {
  syncHomeNavSection();
  window.addEventListener('scroll', syncHomeNavSection, { passive: true });
  window.addEventListener('resize', syncHomeNavSection);
}

document.querySelectorAll('video[data-playlist]').forEach((video) => {
  const playlist = video.dataset.playlist.split('|').filter(Boolean);
  if (playlist.length < 2) return;

  let index = 0;
  let imageTimer;
  let trimHandler;
  let isTransitioning = false;

  const parseItem = (rawSource, itemIndex) => {
    const [source, optionString = ""] = rawSource.split("#");
    const options = new URLSearchParams(optionString);
    return {
      source,
      trimEnd: Number(options.get("trimEnd") || 0),
      isImage: /\.(png|jpe?g|webp)(?:\?|$)/i.test(source),
      element: itemIndex === 0 ? video : null,
      loaded: itemIndex === 0
    };
  };

  const items = playlist.map(parseItem);
  const stage = video.parentElement;

  stage.classList.add('video-playlist-stage');

  items.forEach((item, itemIndex) => {
    if (item.isImage) {
      const image = document.createElement('img');
      image.dataset.src = item.source;
      image.alt = '';
      image.decoding = 'async';
      item.element = image;
      stage.appendChild(image);
      return;
    }

    const layer = itemIndex === 0 ? video : video.cloneNode(false);
    layer.removeAttribute('data-playlist');
    layer.loop = false;
    layer.muted = true;
    setDefaultVideoVolume(layer);
    layer.playsInline = true;
    layer.preload = itemIndex === 0 ? 'metadata' : 'none';
    layer.classList.add('playlist-layer');
    layer.style.opacity = itemIndex === 0 ? '1' : '0';
    layer.style.zIndex = itemIndex === 0 ? '2' : '1';

    if (itemIndex > 0) {
      stage.appendChild(layer);
    } else if (!layer.currentSrc && !layer.getAttribute('src')) {
      layer.src = item.source;
    }

    item.element = layer;
  });

  const ensureItemLoaded = (item) => {
    if (item.loaded) return;

    if (item.isImage) {
      item.element.src = item.element.dataset.src;
      item.loaded = true;
      return;
    }

    item.element.src = item.source;
    item.element.preload = 'metadata';
    item.element.load();
    item.loaded = true;
  };

  const clearCurrentTimers = () => {
    window.clearTimeout(imageTimer);
    if (trimHandler) {
      items[index].element.removeEventListener('timeupdate', trimHandler);
      trimHandler = null;
    }
  };

  const hideItem = (item) => {
    item.element.style.opacity = '0';
    item.element.style.zIndex = '1';

    if (!item.isImage) {
      item.element.pause();
    }
  };

  const showItem = (item) => {
    item.element.style.zIndex = '2';
    item.element.style.opacity = '1';
  };

  const armVideo = (item) => {
    const layer = item.element;

    layer.onended = showNextItem;

    trimHandler = () => {
      if (item.trimEnd > 0 && Number.isFinite(layer.duration) && layer.duration - layer.currentTime <= item.trimEnd) {
        layer.removeEventListener('timeupdate', trimHandler);
        trimHandler = null;
        showNextItem();
      }
    };

    layer.addEventListener('timeupdate', trimHandler);
  };

  const showCurrentItem = () => {
    if (isTransitioning) return;

    clearCurrentTimers();

    const item = items[index];

    ensureItemLoaded(item);

    if (item.isImage) {
      showItem(item);
      imageTimer = window.setTimeout(showNextItem, 3600);
      return;
    }

    item.element.currentTime = 0;
    showItem(item);
    item.element.play().catch(() => {});
    armVideo(item);
  };

  const showNextItem = () => {
    if (isTransitioning) return;
    isTransitioning = true;
    clearCurrentTimers();

    const previousItem = items[index];
    index = (index + 1) % playlist.length;

    const currentItem = items[index];

    ensureItemLoaded(currentItem);

    if (!currentItem.isImage) {
      currentItem.element.currentTime = 0;
      currentItem.element.play().catch(() => {});
    }

    showItem(currentItem);

    window.setTimeout(() => {
      hideItem(previousItem);
      isTransitioning = false;

      if (currentItem.isImage) {
        imageTimer = window.setTimeout(showNextItem, 3600);
      } else {
        armVideo(currentItem);
      }
    }, 260);
  };

  items.forEach((item, itemIndex) => {
    if (itemIndex !== 0) {
      hideItem(item);
    }
  });

  if (!items[index].isImage) {
    items[index].element.play().catch(() => {});
    armVideo(items[index]);
  } else {
    showCurrentItem();
  }
});

const lightboxTargets = document.querySelectorAll(
  '.ai-page .ai-video-card, .ai-page.project-page .gallery-card, .original-page.project-page .project-hero-media, .original-page.project-page .gallery-card'
);

if (lightboxTargets.length) {
  const lightbox = document.createElement('div');
  lightbox.className = 'media-lightbox';
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML = `
    <div class="media-lightbox-frame" role="dialog" aria-modal="true">
      <button class="media-lightbox-close" type="button" aria-label="Close preview">Close</button>
      <div class="media-lightbox-stage"></div>
    </div>
  `;
  document.body.appendChild(lightbox);

  const lightboxFrame = lightbox.querySelector('.media-lightbox-frame');
  const lightboxStage = lightbox.querySelector('.media-lightbox-stage');
  const closeButton = lightbox.querySelector('.media-lightbox-close');
  const isTouchZoomViewport = () => window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  const zoomState = {
    element: null,
    scale: 1,
    x: 0,
    y: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startDistance: 0,
    startMidpoint: { x: 0, y: 0 },
    lastTap: 0
  };

  const getMediaSource = (media) => {
    if (!media) return '';
    const rawSource = media.dataset.fullVideo || media.currentSrc || media.getAttribute('src') || '';
    return rawSource.split('#')[0];
  };

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxStage.replaceChildren();
    resetLightboxZoom();
    document.body.classList.remove('lightbox-open');
  };

  function applyLightboxZoom() {
    if (!zoomState.element) return;
    zoomState.element.style.transform = `translate3d(${zoomState.x}px, ${zoomState.y}px, 0) scale(${zoomState.scale})`;
  }

  function resetLightboxZoom() {
    if (zoomState.element) {
      zoomState.element.style.transform = '';
      zoomState.element.classList.remove('is-zoomed');
    }

    zoomState.element = null;
    zoomState.scale = 1;
    zoomState.x = 0;
    zoomState.y = 0;
    zoomState.startScale = 1;
    zoomState.startX = 0;
    zoomState.startY = 0;
    zoomState.startDistance = 0;
    zoomState.lastTap = 0;
  }

  function clampLightboxPan() {
    if (!zoomState.element || zoomState.scale <= 1) {
      zoomState.x = 0;
      zoomState.y = 0;
      return;
    }

    const frameRect = lightboxFrame.getBoundingClientRect();
    const mediaRect = zoomState.element.getBoundingClientRect();
    const maxX = Math.max(0, (mediaRect.width - frameRect.width) / 2);
    const maxY = Math.max(0, (mediaRect.height - frameRect.height) / 2);

    zoomState.x = Math.max(-maxX, Math.min(maxX, zoomState.x));
    zoomState.y = Math.max(-maxY, Math.min(maxY, zoomState.y));
  }

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function getTouchMidpoint(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  function bindLightboxZoom(mediaElement) {
    resetLightboxZoom();
    zoomState.element = mediaElement;

    mediaElement.addEventListener('touchstart', (event) => {
      if (!isTouchZoomViewport()) return;

      if (event.touches.length === 2) {
        event.preventDefault();
        zoomState.startDistance = getTouchDistance(event.touches);
        zoomState.startMidpoint = getTouchMidpoint(event.touches);
        zoomState.startScale = zoomState.scale;
        zoomState.startX = zoomState.x;
        zoomState.startY = zoomState.y;
        return;
      }

      if (event.touches.length === 1) {
        const now = Date.now();
        if (now - zoomState.lastTap < 280) {
          event.preventDefault();
          zoomState.scale = zoomState.scale > 1 ? 1 : 2.2;
          zoomState.x = 0;
          zoomState.y = 0;
          mediaElement.classList.toggle('is-zoomed', zoomState.scale > 1);
          applyLightboxZoom();
        }
        zoomState.lastTap = now;
        zoomState.startX = zoomState.x;
        zoomState.startY = zoomState.y;
        zoomState.startMidpoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }
    }, { passive: false });

    mediaElement.addEventListener('touchmove', (event) => {
      if (!isTouchZoomViewport()) return;

      if (event.touches.length === 2 && zoomState.startDistance) {
        event.preventDefault();
        const distance = getTouchDistance(event.touches);
        const midpoint = getTouchMidpoint(event.touches);
        zoomState.scale = Math.max(1, Math.min(3, zoomState.startScale * (distance / zoomState.startDistance)));
        zoomState.x = zoomState.startX + (midpoint.x - zoomState.startMidpoint.x);
        zoomState.y = zoomState.startY + (midpoint.y - zoomState.startMidpoint.y);
        clampLightboxPan();
        mediaElement.classList.toggle('is-zoomed', zoomState.scale > 1.01);
        applyLightboxZoom();
        return;
      }

      if (event.touches.length === 1 && zoomState.scale > 1) {
        event.preventDefault();
        zoomState.x = zoomState.startX + (event.touches[0].clientX - zoomState.startMidpoint.x);
        zoomState.y = zoomState.startY + (event.touches[0].clientY - zoomState.startMidpoint.y);
        clampLightboxPan();
        applyLightboxZoom();
      }
    }, { passive: false });

    mediaElement.addEventListener('touchend', () => {
      if (!isTouchZoomViewport()) return;

      if (zoomState.scale < 1.04) {
        zoomState.scale = 1;
        zoomState.x = 0;
        zoomState.y = 0;
        mediaElement.classList.remove('is-zoomed');
      }

      clampLightboxPan();
      applyLightboxZoom();
    });
  }

  const openLightbox = (target) => {
    const media = target.querySelector('video, img');
    if (!media) return;

    const source = getMediaSource(media);
    if (!source) return;

    const preview = media.tagName.toLowerCase() === 'video'
      ? document.createElement('video')
      : document.createElement('img');

    preview.src = source;

    if (preview.tagName.toLowerCase() === 'video') {
      preview.controls = true;
      preview.autoplay = true;
      preview.loop = true;
      preview.muted = false;
      setDefaultVideoVolume(preview);
      preview.playsInline = true;
    } else {
      preview.alt = media.getAttribute('alt') || '';
      preview.decoding = 'async';
    }

    lightboxStage.replaceChildren(preview);
    bindLightboxZoom(preview);
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  };

  lightboxTargets.forEach((target) => {
    if (target.matches('a[href]')) {
      return;
    }

    if (target.classList.contains('project-hero-media-static')) {
      return;
    }

    if (document.body.classList.contains('original-page') && target.querySelector('video')) {
      return;
    }

    target.setAttribute('role', 'button');
    target.setAttribute('tabindex', '0');

    target.addEventListener('click', () => openLightbox(target));
    target.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(target);
      }
    });
  });

  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });
}

const homePage = document.body.classList.contains('home-page');

if (homePage) {
  const backgroundImage = document.querySelector('.home-scroll-bg img');

  let maxBackgroundShift = 0;
  let ticking = false;

  const measureHomeBackground = () => {
    if (!backgroundImage) return;

    const imageHeight = backgroundImage.getBoundingClientRect().height;
    maxBackgroundShift = Math.max(0, imageHeight - window.innerHeight);
    updateHomeBackground();
  };

  const updateHomeBackground = () => {
    const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollMax));

    document.body.style.setProperty('--home-bg-y', `${Math.round(-maxBackgroundShift * progress)}px`);
    ticking = false;
  };

  const requestHomeBackgroundUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHomeBackground);
      ticking = true;
    }
  };

  if (backgroundImage.complete) {
    measureHomeBackground();
  } else {
    backgroundImage.addEventListener('load', measureHomeBackground);
  }

  window.addEventListener('resize', measureHomeBackground);
  window.addEventListener('scroll', requestHomeBackgroundUpdate, { passive: true });
}

const aiPage = document.body.classList.contains('ai-page');

if (aiPage) {
  const backgroundImage = new Image();
  backgroundImage.src = 'assets/Custom Made/AI Creative - Background.webp';

  let maxBackgroundShift = 0;
  let ticking = false;

  const measureAiBackground = () => {
    if (!backgroundImage.naturalWidth || !backgroundImage.naturalHeight) return;

    const coverScale = Math.max(
      window.innerWidth / backgroundImage.naturalWidth,
      window.innerHeight / backgroundImage.naturalHeight
    );
    const renderedHeight = backgroundImage.naturalHeight * coverScale;

    maxBackgroundShift = Math.max(0, renderedHeight - window.innerHeight);
    updateAiBackground();
  };

  const updateAiBackground = () => {
    const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, window.scrollY / scrollMax));

    document.body.style.setProperty('--ai-bg-y', `${Math.round(-maxBackgroundShift * progress)}px`);
    ticking = false;
  };

  const requestAiBackgroundUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateAiBackground);
      ticking = true;
    }
  };

  if (backgroundImage.complete) {
    measureAiBackground();
  } else {
    backgroundImage.addEventListener('load', measureAiBackground);
  }

  window.addEventListener('resize', measureAiBackground);
  window.addEventListener('scroll', requestAiBackgroundUpdate, { passive: true });
}
