---
layout: page
title: "Search"
permalink: /search/
---

<div class="search-page">
  <section class="search-box panel">
    <div class="search-box-header">
      <div>
        <p class="page-description">문서, 태그, 토픽을 한 곳에서 탐색합니다.</p>
      </div>

      <button
        id="search-reset"
        class="search-reset-button"
        type="button"
        aria-label="검색 초기화"
      >
        초기화
      </button>
    </div>

    <form class="search-form" onsubmit="return false;">
      <input
        id="search-input"
        class="search-input"
        type="search"
        placeholder="검색어를 입력하세요. 예: optimizer, fiber, python"
        autocomplete="off"
      />
    </form>

    <div id="search-active-filters" class="search-active-filters"></div>
  </section>

  <section class="search-results panel">
    <div id="search-mode" class="search-mode"></div>
    <div id="search-summary" class="search-summary"></div>
    <div id="search-results"></div>
  </section>

  <details class="search-discovery panel">
    <summary id="search-discovery-summary" class="search-discovery-summary">Tags / Topics 탐색</summary>

    <div class="search-discovery-grid">
      <div class="search-discovery__section">
        <h2 class="section-title">Tags</h2>
        <div id="search-tag-cloud" class="taxonomy-cloud"></div>
      </div>

      <div class="search-discovery__section">
        <h2 class="section-title">Topics</h2>
        <div id="search-topic-cloud" class="taxonomy-cloud"></div>
      </div>
    </div>
  </details>
</div>

<script src="{{ '/assets/js/search.js' | relative_url }}"></script>
<script src="{{ '/assets/js/tags.js' | relative_url }}"></script>
<script src="{{ '/assets/js/topics.js' | relative_url }}"></script>