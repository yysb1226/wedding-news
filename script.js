
(() => {
  "use strict";

  // ============================================
  // CONFIGURATION
  // ============================================

  // Enter your existing Supabase credentials.
  // Use a PUBLIC publishable key only.
  // NEVER put a secret/service_role key here.

  const SUPABASE_URL = "https://clestcghqwaptwliwcva.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_f1Uof1GHbOUGxtibQzlSRA_S2sGDluA";

  const root = document.documentElement;
  root.classList.add("js");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  // ============================================
  // 1. PHOTO LOADING
  // ============================================

  // Display images when loaded.
  // Show placeholders if files are missing.

  document.querySelectorAll("[data-photo]").forEach((shell) => {
    const img = shell.querySelector("img");
    const placeholder = shell.querySelector(".photo-placeholder");

    if (!img) return;

    const showPhoto = () => {
      shell.classList.add("is-loaded");
      shell.classList.remove("is-missing");

      placeholder?.setAttribute("aria-hidden", "true");
    };

    const showPlaceholder = () => {
      shell.classList.add("is-missing");
      shell.classList.remove("is-loaded");

      placeholder?.setAttribute("aria-hidden", "false");
    };

    img.addEventListener("load", showPhoto);
    img.addEventListener("error", showPlaceholder);

    if (img.complete) {
      (img.naturalWidth > 0 ? showPhoto : showPlaceholder)();
    }
  });

  // ============================================
  // 2. SCROLL REVEAL ANIMATIONS
  // ============================================

  const revealItems = document.querySelectorAll(".reveal");

  if (
    !prefersReducedMotion.matches &&
    "IntersectionObserver" in window
  ) {
    root.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.06,
        rootMargin: "0px 0px -5% 0px"
      }
    );

    revealItems.forEach((item) => {
      observer.observe(item);
    });

  } else {
    revealItems.forEach((item) => {
      item.classList.add("is-visible");
    });
  }

  // ============================================
  // 3. READING PROGRESS BAR
  // ============================================

  const progressBar = document.querySelector(
    ".reading-progress span"
  );

  let progressPending = false;

  const updateProgress = () => {
    const max = root.scrollHeight - window.innerHeight;

    const progress = max > 0
      ? Math.min(1, Math.max(0, window.scrollY / max))
      : 0;

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress})`;
    }

    progressPending = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (progressPending) return;

      progressPending = true;
      requestAnimationFrame(updateProgress);
    },
    { passive: true }
  );

  window.addEventListener(
    "resize",
    updateProgress,
    { passive: true }
  );

  updateProgress();

  // ============================================
  // 4. PHOTO BOOK SLIDER
  // ============================================

  // Photos:
  // wedding_4.jpg
  // wedding_4_2.jpg
  // wedding_4_3.jpg
  // wedding_4_4.jpg
  // wedding_4_5.jpg
  // wedding_4_6.jpg
  // wedding_4_7.jpg
  // wedding_4_8.jpg
  //
  // Features:
  // - Smartphone swipe
  // - Previous / next buttons
  // - Keyboard arrow navigation
  // - Numbered page indicators
  // - Page-turn animation
  // - Reduced-motion accessibility
  // - Adjacent photo preloading

  const book = document.getElementById("story-photo-book");

  if (book) {
    const stage = document.getElementById("book-stage");

    const slides = [
      ...book.querySelectorAll(".photo-slide")
    ];

    const prev = document.getElementById("book-prev");
    const next = document.getElementById("book-next");
    const counter = document.getElementById("book-counter");
    const dots = document.getElementById("book-dots");

    let current = 0;
    let busy = false;
    let pointerStart = null;
    let finishTimer = null;

    // ----------------------------------------
    // Preload adjacent images
    // ----------------------------------------

    function preloadAdjacent(index) {
      if (!slides.length) return;

      [-1, 0, 1].forEach((offset) => {
        const targetIndex =
          (index + offset + slides.length) % slides.length;

        const img = slides[targetIndex].querySelector("img");

        if (img) {
          img.loading = "eager";
        }
      });
    }

    // ----------------------------------------
    // Create page indicator buttons
    // ----------------------------------------

    const dotButtons = slides.map((_, i) => {
      const dot = document.createElement("button");

      dot.type = "button";
      dot.className = "book-dot";

      dot.setAttribute(
        "aria-label",
        `${i + 1}번째 사진 보기`
      );

      dot.addEventListener("click", () => {
        goTo(i);
      });

      dots.append(dot);

      return dot;
    });

    // ----------------------------------------
    // Render counter and buttons
    // ----------------------------------------

    function render() {
      counter.textContent =
        `${String(current + 1).padStart(2, "0")} / ` +
        `${String(slides.length).padStart(2, "0")}`;

      dotButtons.forEach((dot, i) => {
        if (i === current) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });

      prev.disabled = busy;
      next.disabled = busy;
    }

    // ----------------------------------------
    // Navigate to a specific photo
    // ----------------------------------------

    function goTo(target, direction) {
      if (busy || slides.length < 2) return;

      const newIndex =
        (target + slides.length) % slides.length;

      if (newIndex === current) return;

      const oldSlide = slides[current];
      const newSlide = slides[newIndex];

      const forward =
        direction ||
        (newIndex > current ? "next" : "prev");

      busy = true;
      current = newIndex;

      // Reveal the new image beneath the old one.

      newSlide.classList.add("is-active");
      newSlide.setAttribute("aria-hidden", "false");

      oldSlide.classList.remove("is-active");
      oldSlide.setAttribute("aria-hidden", "true");

      preloadAdjacent(current);
      render();

      // Skip animation if reduced motion is preferred.

      if (prefersReducedMotion.matches) {
        busy = false;
        render();
        return;
      }

      // Apply appropriate page-turn direction.

      const flipClass =
        forward === "prev"
          ? "is-turning-prev"
          : "is-turning-next";

      oldSlide.classList.add(
        "is-turning",
        flipClass
      );

      // Clean up after the animation.
      // Timeout acts as a fallback if animationend
      // does not fire (for example, when switching tabs).

      let finished = false;

      function finishTurn() {
        if (finished) return;

        finished = true;

        clearTimeout(finishTimer);

        oldSlide.removeEventListener(
          "animationend",
          onEnd
        );

        oldSlide.classList.remove(
          "is-turning",
          "is-turning-next",
          "is-turning-prev"
        );

        busy = false;
        render();
      }

      function onEnd(event) {
        if (event.target === oldSlide) {
          finishTurn();
        }
      }

      oldSlide.addEventListener(
        "animationend",
        onEnd
      );

      finishTimer = setTimeout(
        finishTurn,
        850
      );
    }

    // ----------------------------------------
    // Previous and next buttons
    // ----------------------------------------

    prev.addEventListener("click", () => {
      goTo(current - 1, "prev");
    });

    next.addEventListener("click", () => {
      goTo(current + 1, "next");
    });

    // ----------------------------------------
    // Keyboard navigation
    // ----------------------------------------

    stage.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(current - 1, "prev");

      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(current + 1, "next");
      }
    });

    // ----------------------------------------
    // Smartphone swipe navigation
    // ----------------------------------------

    stage.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length !== 1) {
          pointerStart = null;
          return;
        }

        pointerStart = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        };
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchend",
      (event) => {
        if (
          !pointerStart ||
          event.changedTouches.length !== 1
        ) {
          return;
        }

        const dx =
          event.changedTouches[0].clientX -
          pointerStart.x;

        const dy =
          event.changedTouches[0].clientY -
          pointerStart.y;

        pointerStart = null;

        // Only recognize horizontal gestures.
        // Vertical scrolling remains unaffected.

        if (
          Math.abs(dx) >= 45 &&
          Math.abs(dx) > Math.abs(dy) * 1.3
        ) {
          const direction =
            dx < 0 ? "next" : "prev";

          goTo(
            current + (dx < 0 ? 1 : -1),
            direction
          );
        }
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchcancel",
      () => {
        pointerStart = null;
      },
      { passive: true }
    );

    // ----------------------------------------
    // Initialize slider
    // ----------------------------------------

    preloadAdjacent(0);
    render();
  }

  // ============================================
  // 5. SHARE WEDDING ANNOUNCEMENT
  // ============================================

  const shareButton = document.getElementById(
    "share-button"
  );

  const shareStatus = document.getElementById(
    "share-status"
  );

  shareButton?.addEventListener("click", async () => {
    const url = location.href.split("#")[0];

    const data = {
      title: document.title,
      text: "서로의 삶에 따뜻한 온기가 되어줄 두 사람이 만났습니다.",
      url
    };

    try {
      if (navigator.share) {
        await navigator.share(data);

      } else {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard unavailable");
        }

        await navigator.clipboard.writeText(url);

        if (shareStatus) {
          shareStatus.textContent =
            "링크가 복사되었습니다.";
        }
      }

    } catch (error) {
      if (
        error.name !== "AbortError" &&
        shareStatus
      ) {
        shareStatus.textContent =
          "주소창에서 링크를 복사해 주세요.";
      }
    }
  });

  // ============================================
  // 6. SUPABASE GUESTBOOK
  // ============================================

  // The guestbook uses the existing database:
  //
  // public.guestbook_messages
  //
  // Expected columns:
  // id, name, message, approved, created_at
  //
  // Only approved messages are visible publicly.

  const form = document.getElementById(
    "guestbook-form"
  );

  const nameInput = document.getElementById(
    "guest-name"
  );

  const messageInput = document.getElementById(
    "guest-message"
  );

  const honeypotInput = document.getElementById(
    "guest-website"
  );

  const submitButton = document.getElementById(
    "guest-submit"
  );

  const formStatus = document.getElementById(
    "form-status"
  );

  const messagesStatus = document.getElementById(
    "messages-status"
  );

  const messageList = document.getElementById(
    "message-list"
  );

  const refreshButton = document.getElementById(
    "refresh-messages"
  );

  // ----------------------------------------
  // Verify Supabase configuration
  // ----------------------------------------

  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(
      SUPABASE_URL
    ) &&
    SUPABASE_PUBLISHABLE_KEY.startsWith(
      "sb_publishable_"
    );

  if (!configured) {
    if (formStatus) {
      formStatus.textContent =
        "방명록을 준비 중입니다. 설정 후 메시지를 남길 수 있습니다.";
    }

    if (messagesStatus) {
      messagesStatus.textContent =
        "아직 방명록이 연결되지 않았습니다.";
    }

    return;
  }

  // ----------------------------------------
  // Supabase REST API
  // ----------------------------------------

  const base =
    SUPABASE_URL.replace(/\/$/, "") +
    "/rest/v1/guestbook_messages";

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY
  };

  submitButton.disabled = false;
  refreshButton.disabled = false;

  formStatus.textContent =
    "작성하신 메시지는 확인 후 공개됩니다.";

  // ----------------------------------------
  // Format message dates
  // ----------------------------------------

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  };

  // ----------------------------------------
  // Render approved messages
  // ----------------------------------------

  function renderMessages(messages) {
    messageList.replaceChildren();

    if (!messages.length) {
      messagesStatus.textContent =
        "첫 번째 축하 메시지를 기다리고 있습니다.";

      return;
    }

    messagesStatus.textContent =
      `공개된 축하 메시지 ${messages.length}개`;

    messages.forEach(
      ({ name, message, created_at }) => {
        const item = document.createElement("li");
        item.className = "message-item";

        const header = document.createElement("div");
        header.className = "message-item-header";

        const author = document.createElement("strong");
        author.className = "message-author";
        author.textContent = name;

        const date = document.createElement("time");
        date.className = "message-date";
        date.dateTime = created_at;
        date.textContent = formatDate(created_at);

        const content = document.createElement("p");
        content.className = "message-content";

        // textContent prevents HTML injection.
        content.textContent = message;

        header.append(author, date);
        item.append(header, content);
        messageList.append(item);
      }
    );
  }

  // ----------------------------------------
  // Load approved messages
  // ----------------------------------------

  async function loadMessages() {
    refreshButton.disabled = true;

    messagesStatus.textContent =
      "축하 메시지를 불러오는 중입니다...";

    try {
      const query =
        "?select=name,message,created_at" +
        "&order=created_at.desc" +
        "&limit=30";

      const response = await fetch(
        base + query,
        {
          headers,
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `GET failed: ${response.status}`
        );
      }

      const messages = await response.json();

      if (!Array.isArray(messages)) {
        throw new Error("Invalid response");
      }

      renderMessages(messages);

    } catch (error) {
      console.error(
        "방명록 조회 오류:",
        error
      );

      messagesStatus.textContent =
        "메시지를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.";

    } finally {
      refreshButton.disabled = false;
    }
  }

  // ----------------------------------------
  // Submit congratulations message
  // ----------------------------------------

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (
        honeypotInput.value.trim() ||
        !form.reportValidity()
      ) {
        return;
      }

      const name = nameInput.value.trim();
      const message = messageInput.value.trim();

      if (
        !name ||
        name.length > 30 ||
        message.length < 2 ||
        message.length > 300
      ) {
        formStatus.textContent =
          "이름과 메시지 길이를 확인해 주세요.";

        return;
      }

      submitButton.disabled = true;

      formStatus.textContent =
        "메시지를 전송하는 중입니다...";

      try {
        const response = await fetch(
          base,
          {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
              Prefer: "return=minimal"
            },
            body: JSON.stringify({
              name,
              message
            })
          }
        );

        if (!response.ok) {
          throw new Error(
            `POST failed: ${response.status}`
          );
        }

        form.reset();

        formStatus.textContent =
          "감사합니다! 메시지가 접수되었습니다. 확인 후 방명록에 공개됩니다.";

      } catch (error) {
        console.error(
          "방명록 등록 오류:",
          error
        );

        formStatus.textContent =
          "등록하지 못했습니다. 연결 상태를 확인한 후 다시 시도해 주세요.";

      } finally {
        submitButton.disabled = false;
      }
    }
  );

  // ----------------------------------------
  // Refresh guestbook
  // ----------------------------------------

  refreshButton.addEventListener(
    "click",
    loadMessages
  );

  // Initial guestbook loading
  loadMessages();

})();
