
(() => {
  "use strict";

  // Enter your Supabase Project URL and publishable key.
  // Never put a service_role or secret key here.
  const SUPABASE_URL = "";
  const SUPABASE_PUBLISHABLE_KEY = "";

  const root = document.documentElement;
  root.classList.add("js");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ======================================
  // Photo loading
  // ======================================

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

  // ======================================
  // Scroll reveal
  // ======================================

  const revealItems = document.querySelectorAll(".reveal");

  if (!reduceMotion && "IntersectionObserver" in window) {
    root.classList.add("motion-ready");

    const observer = new IntersectionObserver(
      (entries, current) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          current.unobserve(entry.target);
        });
      },
      {
        threshold: 0.06,
        rootMargin: "0px 0px -5% 0px"
      }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => {
      item.classList.add("is-visible");
    });
  }

  // ======================================
  // Reading progress
  // ======================================

  const progressBar = document.querySelector(".reading-progress span");
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

  window.addEventListener("scroll", () => {
    if (progressPending) return;

    progressPending = true;
    requestAnimationFrame(updateProgress);
  }, { passive: true });

  window.addEventListener(
    "resize",
    updateProgress,
    { passive: true }
  );

  updateProgress();

  // ======================================
  // Share
  // ======================================

  const shareButton = document.getElementById("share-button");
  const shareStatus = document.getElementById("share-status");

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
        shareStatus.textContent = "링크가 복사되었습니다.";
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        shareStatus.textContent =
          "주소창에서 링크를 복사해 주세요.";
      }
    }
  });

  // ======================================
  // Guestbook
  // ======================================

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
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL) &&
    SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

  if (!configured) {
    formStatus.textContent =
      "방명록을 준비 중입니다. 설정 후 메시지를 남길 수 있습니다.";

    messagesStatus.textContent =
      "아직 방명록이 연결되지 않았습니다.";

    return;
  }

  const base = SUPABASE_URL.replace(/\/$/, "") +
    "/rest/v1/guestbook_messages";

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY
  };

  submitButton.disabled = false;
  refreshButton.disabled = false;

  formStatus.textContent =
    "작성하신 메시지는 확인 후 공개됩니다.";

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  };

  // Display stored, approved congratulations.
  const renderMessages = (messages) => {
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
      content.textContent = message;

      header.append(author, date);
      item.append(header, content);
      messageList.append(item);
    });
  };

  const loadMessages = async () => {
    refreshButton.disabled = true;
    messagesStatus.textContent =
      "축하 메시지를 불러오는 중입니다...";

    try {
      const query =
        "?select=name,message,created_at" +
        "&order=created_at.desc&limit=30";

      const response = await fetch(base + query, {
        headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`GET failed: ${response.status}`);
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
  };

  // Submit a new congratulations message.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (honeypotInput.value.trim()) return;
    if (!form.reportValidity()) return;

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
      const response = await fetch(base, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ name, message })
      });

      if (!response.ok) {
        throw new Error(`POST failed: ${response.status}`);
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

  refreshButton.addEventListener("click", loadMessages);

  loadMessages();
})();
