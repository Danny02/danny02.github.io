---
layout: home
image:
  feature: california1600.jpg
  title: "Daniel Heinrich"
  excerpt: "Software Development"
permalink: /
---

<div class="tiles">
  {% for post in site.posts %}
    <div class="tile">
      <h2 class="post-title">{{ post.title }}</h2>
      <p class="post-excerpt">{{ post.excerpt }}</p>
      <a href="{{ post.url }}">more</a>
    </div><!-- /.tile -->
  {% endfor %} 
</div><!-- /.tiles -->

