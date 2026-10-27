
(() => {
  "use strict";

  document.documentElement.classList.add("js");

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // Show every JPG when available; otherwise show its placeholder.
  // This also works for both photographs inside each album.
  document.querySelectorAll("[data-photo]").forEach((shell) => {
    const img = shell.querySelector("img");
    const placeholder = shell.querySelector(".photo-placeholder");
    if (!img) return;

    const loaded = () => {
      shell.classList.add("is-loaded");
      shell.classList.remove("is-missing");
      placeholder?.setAttribute("aria-hidden", "true");
    };

    const missing = () => {
      shell.classList.add("is-missing");
      shell.classList.remove("is-loaded");
      placeholder?.setAttribute("aria-hidden", "false");
    };

    img.addEventListener("load", loaded);
    img.addEventListener("error", missing);
    if (img.complete) {
      img.naturalWidth > 0 ? loaded() : missing();
    }
  });

  // Reveal sections as readers scroll down.
  const revealItems = document.querySelectorAll(".reveal");
  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          activeObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8%", threshold: 0.08 }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // Update the reading progress at the top.
  const progressBar = document.querySelector(".reading-progress span");
  let ticking = false;
  const updateProgress = () => {
    if (progressBar) {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = height > 0
        ? Math.max(0, Math.min(window.scrollY / height, 1))
        : 0;
      progressBar.style.transform = `scaleX(${fraction})`;
    }
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  // Share via the phone's share menu, or copy the link on desktop.
  const shareButton = document.getElementById("share-button");
  const shareStatus = document.getElementById("share-status");
  shareButton?.addEventListener("click", async () => {
    const url = window.location.href.split("#")[0];
    const shareData = {
      title: document.title,
      text: "초대 대신, 저희의 결혼 소식을 전합니다.",
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        if (shareStatus) shareStatus.textContent = "";
      } catch (error) {
        if (error.name !== "AbortError" && shareStatus) {
          shareStatus.textContent = "공유하지 못했습니다. 주소창에서 링크를 복사해 주세요.";
        }
      }
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      if (shareStatus) shareStatus.textContent = "링크가 복사되었습니다.";
    } catch {
      if (shareStatus) shareStatus.textContent = "주소창에서 링크를 복사해 주세요.";
    }
  });
})();
