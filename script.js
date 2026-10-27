(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // ========================================
  // 1. Photo Loading & Placeholders
  // ========================================

  document.querySelectorAll("[data-photo]").forEach((shell) => {
    const image = shell.querySelector("img");
    const placeholder = shell.querySelector(".photo-placeholder");

    if (!image) return;

    const markLoaded = () => {
      shell.classList.remove("is-missing");
      shell.classList.add("is-loaded");

      if (placeholder) {
        placeholder.setAttribute("aria-hidden", "true");
      }
    };

    const markMissing = () => {
      shell.classList.remove("is-loaded");
      shell.classList.add("is-missing");

      if (placeholder) {
        placeholder.removeAttribute("aria-hidden");
      }
    };

    image.addEventListener("load", markLoaded);
    image.addEventListener("error", markMissing);

    if (image.complete) {
      if (image.naturalWidth > 0) {
        markLoaded();
      } else {
        markMissing();
      }
    }
  });

  // ========================================
  // 2. Scroll Reveal Animations
  // ========================================

  const revealItems = [...document.querySelectorAll(".reveal")];

  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8%",
        threshold: 0.08,
      },
    );

    revealItems.forEach((item) => {
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => {
      item.classList.add("is-visible");
    });
  }

  // ========================================
  // 3. Reading Progress Bar
  // ========================================

  const progressBar = document.querySelector(".reading-progress span");

  let ticking = false;

  const updateProgress = () => {
    if (!progressBar) {
      ticking = false;
      return;
    }

    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;

    const progress =
      scrollable > 0
        ? Math.max(0, Math.min(window.scrollY / scrollable, 1))
        : 0;

    progressBar.style.transform = `scaleX(${progress})`;

    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(updateProgress);
    },
    { passive: true },
  );

  window.addEventListener("resize", updateProgress, { passive: true });

  updateProgress();

  // ========================================
  // 4. Share Wedding Announcement
  // ========================================

  const shareButton = document.getElementById("share-button");
  const shareStatus = document.getElementById("share-status");

  const setShareStatus = (message) => {
    if (shareStatus) {
      shareStatus.textContent = message;
    }
  };

  if (shareButton) {
    shareButton.addEventListener("click", async () => {
      const url = window.location.href.split("#")[0];

      const shareData = {
        title: document.title,
        text: "초대 대신, 저희의 결혼 소식을 전합니다.",
        url: url,
      };

      // Native sharing on supported mobile devices
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          setShareStatus("");
        } catch (error) {
          if (error.name !== "AbortError") {
            setShareStatus(
              "공유하지 못했습니다. 주소창에서 링크를 복사해 주세요.",
            );
          }
        }

        return;
      }

      // Clipboard fallback for desktop browsers
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard unavailable");
        }

        await navigator.clipboard.writeText(url);

        setShareStatus("링크가 복사되었습니다.");
      } catch (error) {
        setShareStatus("주소창에서 링크를 복사해 주세요.");
      }
    });
  }

  // ========================================
  // 5. Back to Top
  // ========================================

  const backToTop = document.getElementById("back-to-top");

  if (backToTop) {
    backToTop.addEventListener("click", (event) => {
      event.preventDefault();

      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  }
})();
