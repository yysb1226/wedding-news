(() => {
  "use strict";

  // ============================================
  // CONFIGURATION
  // ============================================

  // Insert your existing Supabase credentials.
  // NEVER use a secret/service_role key here.

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
      if (img.naturalWidth > 0) {
        showPhoto();
      } else {
        showPlaceholder();
      }
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
  // 3. READING PROGRESS
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

  // Supported photo proportions:
  //
  // Portrait:  4:5
  // Landscape: 5:4
  //
  // Image orientation is detected automatically.
  // No cropping or zooming.
  //
  // Navigation:
  // - Swipe left/right
  // - Previous/next buttons
  // - Keyboard arrows
  // - Page indicator buttons
  //
  // All transitions preserve the page-turn effect.

  const book = document.getElementById(
    "story-photo-book"
  );

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

    // ========================================
    // 4.1. Automatic image aspect ratio
    // ========================================

    function updateStageFit(index = current) {

      if (!stage || !slides[index]) return;

      const img = slides[index].querySelector("img");

      if (
        !img ||
        img.naturalWidth === 0 ||
        img.naturalHeight === 0
      ) {
        return;
      }

      // Determine orientation using the actual
      // dimensions of the loaded image file.

      const landscape =
        img.naturalWidth > img.naturalHeight;

      // All images have been prepared as
      // either 5:4 landscape or 4:5 portrait.

      const ratio = landscape ? 5 / 4 : 4 / 5;

      const ratioText = landscape
        ? "5 / 4"
        : "4 / 5";

      // Orientation information for CSS.

      stage.dataset.orientation = landscape
        ? "landscape"
        : "portrait";

      // Update album aspect ratio.

      stage.style.setProperty(
        "--book-ratio",
        ratioText
      );

      // Prevent portrait photos from becoming
      // excessively tall on smaller screens.

      const viewportHeight =
        window.visualViewport?.height ||
        window.innerHeight;

      const maxWidth = Math.min(
        485,
        Math.floor(viewportHeight * 0.76 * ratio)
      );

      stage.style.setProperty(
        "--book-width-cap",
        `${maxWidth}px`
      );

      updateProgress();
    }

    // ========================================
    // 4.2. Handle lazy-loaded images
    // ========================================

    slides.forEach((slide, index) => {

      const img = slide.querySelector("img");

      if (!img) return;

      img.addEventListener("load", () => {

        // Only resize if the loaded image
        // is currently being displayed.

        if (index === current) {
          updateStageFit(index);
        }
      });

    });

    // ========================================
    // 4.3. Preload nearby images
    // ========================================

    function preloadAdjacent(index) {

      if (!slides.length) return;

      [-1, 0, 1].forEach((offset) => {

        const target =
          (index + offset + slides.length) %
          slides.length;

        const img = slides[target].querySelector("img");

        if (img) {
          img.loading = "eager";
        }
      });
    }

    // ========================================
    // 4.4. Create page indicators
    // ========================================

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

    // ========================================
    // 4.5. Render controls
    // ========================================

    function render() {

      // Automatically display the actual
      // number of photos in the HTML.

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

    // ========================================
    // 4.6. Navigate between photos
    // ========================================

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

      // Show the next photo beneath
      // the current photo.

      newSlide.classList.add("is-active");
      newSlide.setAttribute("aria-hidden", "false");

      oldSlide.classList.remove("is-active");
      oldSlide.setAttribute("aria-hidden", "true");

      // Preload upcoming photos.

      preloadAdjacent(current);

      // Switch the album to 4:5 or 5:4.

      updateStageFit(current);

      render();

      // Respect reduced-motion settings.

      if (prefersReducedMotion.matches) {
        busy = false;
        render();
        return;
      }

      // Choose the correct flip direction.

      const flipClass = forward === "prev"
        ? "is-turning-prev"
        : "is-turning-next";

      oldSlide.classList.add(
        "is-turning",
        flipClass
      );

      // Clean up the animation.

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

      // Fallback when animationend does not fire.

      finishTimer = setTimeout(
        finishTurn,
        850
      );
    }

    // ========================================
    // 4.7. Previous / next buttons
    // ========================================

    prev.addEventListener("click", () => {
      goTo(current - 1, "prev");
    });

    next.addEventListener("click", () => {
      goTo(current + 1, "next");
    });

    // ========================================
    // 4.8. Keyboard navigation
    // ========================================

    stage.addEventListener("keydown", (event) => {

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(current - 1, "prev");
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(current + 1, "next");
      }
    });

    // ========================================
    // 4.9. Smartphone swipe navigation
    // ========================================

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

        // Only process horizontal gestures.
        // Vertical scrolling remains unaffected.

        if (
          Math.abs(dx) >= 45 &&
          Math.abs(dx) > Math.abs(dy) * 1.3
        ) {
          goTo(
            current + (dx < 0 ? 1 : -1),
            dx < 0 ? "next" : "prev"
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

    // ========================================
    // 4.10. Initialize slider
    // ========================================

    preloadAdjacent(0);
    updateStageFit(0);

    // Recalculate size on screen rotation
    // or browser window resizing.

    window.addEventListener(
      "resize",
      () => updateStageFit(),
      { passive: true }
    );

    window.visualViewport?.addEventListener(
      "resize",
      () => updateStageFit(),
      { passive: true }
    );

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
      text: "김성빈과 최윤영의 결혼 소식을 전합니다.",
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

  // Existing Supabase table:
  //
  // public.guestbook_messages
  //
  // Columns:
  // id, name, message, approved, created_at
  //
  // Visitors can submit messages.
  // Only approved messages are displayed.

  const form = document.getElementById("guestbook-form");
  const nameInput = document.getElementById("guest-name");
  const messageInput = document.getElementById("guest-message");
  const honeypotInput = document.getElementById("guest-website");

  const submitButton = document.getElementById("guest-submit");
  const formStatus = document.getElementById("form-status");
  const messagesStatus = document.getElementById("messages-status");
  const messageList = document.getElementById("message-list");
  const refreshButton = document.getElementById("refresh-messages");

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

  // ========================================
  // 6.1. Supabase REST API
  // ========================================

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

  // ========================================
  // 6.2. Format dates
  // ========================================

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

  // ========================================
  // 6.3. Render approved messages
  // ========================================

  function renderMessages(messages) {

    messageList.replaceChildren();

    if (!messages.length) {
      messagesStatus.textContent =
        "첫 번째 축하 메시지를 기다리고 있습니다.";
      return;
    }

    messagesStatus.textContent =
      `공개된 축하 메시지 ${messages.length}개`;

    messages.forEach(({ name, message, created_at }) => {

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

      // Prevent HTML injection.
      content.textContent = message;

      header.append(author, date);
      item.append(header, content);
      messageList.append(item);
    });
  }

  // ========================================
  // 6.4. Load guestbook messages
  // ========================================

  async function loadMessages() {

    refreshButton.disabled = true;

    messagesStatus.textContent =
      "축하 메시지를 불러오는 중입니다...";

    try {

      const query =
        "?select=name,message,created_at" +
        "&order=created_at.desc" +
        "&limit=100";

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

      console.error("방명록 조회 오류:", error);

      messagesStatus.textContent =
        "메시지를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.";

    } finally {
      refreshButton.disabled = false;
    }
  }

  // ========================================
  // 6.5. Submit guestbook message
  // ========================================

  form.addEventListener("submit", async (event) => {

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
      message.length > 1000
    ) {
      formStatus.textContent =
        "이름과 메시지 길이를 확인해 주세요.";
      return;
    }

    submitButton.disabled = true;

    formStatus.textContent =
      "메시지를 전송하는 중입니다...";

    try {

      const response = await fetch(base, {
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
      });

      if (!response.ok) {
        throw new Error(
          `POST failed: ${response.status}`
        );
      }

      form.reset();

      formStatus.textContent =
        "감사합니다! 메시지가 접수되었습니다. 확인 후 방명록에 공개됩니다.";

    } catch (error) {

      console.error("방명록 등록 오류:", error);

      formStatus.textContent =
        "등록하지 못했습니다. 연결 상태를 확인한 후 다시 시도해 주세요.";

    } finally {
      submitButton.disabled = false;
    }
  });

  // ========================================
  // 6.6. Refresh messages
  // ========================================

    // ==========================================
  // EXPANDABLE CONGRATULATIONS MESSAGE LIST
  // ==========================================

  // 처음에 보여줄 메시지 개수
  const VISIBLE_MESSAGE_COUNT = 3;

  // 현재 펼쳐진 상태인지 확인
  let messagesExpanded = false;

  // 더 보기 / 접기 버튼 생성
  const toggleMessagesButton = document.createElement("button");

  toggleMessagesButton.type = "button";
  toggleMessagesButton.id = "toggle-messages";
  toggleMessagesButton.className = "message-toggle";

  toggleMessagesButton.hidden = true;

  toggleMessagesButton.setAttribute(
    "aria-controls",
    "message-list"
  );

  toggleMessagesButton.setAttribute(
    "aria-expanded",
    "false"
  );

  // 메시지 목록 바로 아래에 버튼 배치
  messageList.insertAdjacentElement(
    "afterend",
    toggleMessagesButton
  );

  // 메시지 표시 상태 업데이트
  function updateMessageCollapse() {

    const totalMessages = messageList.children.length;

    const extraMessages = Math.max(
      0,
      totalMessages - VISIBLE_MESSAGE_COUNT
    );

    // 추가 메시지가 없으면 초기 상태로 변경
    if (extraMessages === 0) {
      messagesExpanded = false;
    }

    // 메시지 3개 초과 + 접힌 상태일 때만 목록 접기
    const shouldCollapse =
      extraMessages > 0 && !messagesExpanded;

    messageList.classList.toggle(
      "is-collapsed",
      shouldCollapse
    );

    // 메시지가 3개 이하면 버튼 숨기기
    toggleMessagesButton.hidden = extraMessages === 0;

    // 접근성 속성 업데이트
    toggleMessagesButton.setAttribute(
      "aria-expanded",
      String(messagesExpanded)
    );

    // 버튼 문구 변경
    if (messagesExpanded) {
      toggleMessagesButton.textContent =
        "축하 메시지 접기 ↑";
    } else {
      toggleMessagesButton.textContent =
        `축하 메시지 ${extraMessages}개 더 보기 ↓`;
    }
  }

  // 버튼 클릭 시 펼치기 / 접기
  toggleMessagesButton.addEventListener("click", () => {

    messagesExpanded = !messagesExpanded;

    updateMessageCollapse();

  });

  // Supabase에서 메시지를 새로 불러올 때 자동 업데이트
  const messagesObserver = new MutationObserver(() => {
    updateMessageCollapse();
  });

  messagesObserver.observe(messageList, {
    childList: true
  });

  // 기존 새로고침 기능
  refreshButton.addEventListener("click", loadMessages);

  // 최초 메시지 불러오기
  loadMessages();

})();
