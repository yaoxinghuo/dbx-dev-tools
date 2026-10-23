<script>
  let { size = 15 } = $props();
</script>

<svg class="ghsvg" viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
  <circle class="ghring" cx="12" cy="12" r="11" stroke="url(#gh-grad)" stroke-width="1.5" stroke-dasharray="14 9" />
  <path class="ghcat" fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  <defs>
    <!-- stop-color accepts CSS vars, so the gradient follows the host theme
         (teal-600 light / teal-500→400 dark) instead of a fixed palette. -->
    <linearGradient id="gh-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0" style="stop-color: var(--color-primary, #0d9488)" />
      <stop offset="1" style="stop-color: var(--color-ring, #2dd4bf)" />
    </linearGradient>
  </defs>
</svg>

<style>
  .ghsvg { overflow: visible; display: block; }

  /* Idle: the ring drifts slowly at low opacity, and the cat flicks every
     ~7s (mostly still — just a brief ±4° rock). Hover raises the stakes:
     ring goes full-strength and faster, cat wags harder and takes the
     gradient fill. Reduced-motion keeps the ring static but visible. */
  .ghring {
    opacity: 0.35;
    transform-origin: center;
    transform-box: fill-box;
    animation: ghspin 14s linear infinite;
  }
  .ghcat {
    transform-origin: 50% 85%;
    transform-box: fill-box;
    transition: fill 0.3s ease;
    animation: ghidle 5s ease-in-out infinite;
  }

  .ghsvg:hover .ghring,
  :global(.ghbtn):hover .ghring,
  :global(.ghfoot):hover .ghring {
    opacity: 1;
    animation-duration: 4s;
  }
  .ghsvg:hover .ghcat,
  :global(.ghbtn):hover .ghcat,
  :global(.ghfoot):hover .ghcat {
    fill: url(#gh-grad);
    animation: ghwag 0.8s ease-in-out infinite alternate;
  }

  @keyframes ghspin {
    100% { transform: rotate(360deg); }
  }
  /* Most of the timeline is motionless — the wag occupies ~15%. */
  @keyframes ghidle {
    0%, 80%, 100% { transform: rotate(0deg); }
    83% { transform: rotate(-4deg); }
    87% { transform: rotate(4deg); }
    91% { transform: rotate(-3deg); }
    95% { transform: rotate(2deg); }
  }
  @keyframes ghwag {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(-8deg) scale(1.08); }
    75% { transform: rotate(8deg) scale(1.08); }
    100% { transform: rotate(0deg) scale(1.05); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ghring, .ghcat { animation: none !important; }
    .ghsvg:hover .ghcat, :global(.ghbtn):hover .ghcat, :global(.ghfoot):hover .ghcat { fill: url(#gh-grad); }
  }
</style>
