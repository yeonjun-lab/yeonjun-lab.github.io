---
layout: page
title: "Search"
permalink: /search/
---

<div class="search-page">
  <div class="search-box-wrap">
    <input
      id="search-input"
      class="search-input"
      type="search"
      placeholder="검색어를 입력하세요. 예: optimizer, fiber, python"
      autocomplete="off"
    />
  </div>

  <div id="search-summary" class="search-summary"></div>
  <div id="search-results" class="search-results"></div>
</div>

<script src="{{ '/assets/js/search.js' | relative_url }}"></script>
