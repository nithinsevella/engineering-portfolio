export function renderSite(raw, opts = {}) {
  const { site, home, about, skills, writing } = raw;
  const review = Boolean(opts.review);
  const cms = 'https://app.pagescms.org/';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const text = (v) => typeof v === 'string' ? v.trim() : '';
  const list = (v) => Array.isArray(v) ? v.filter(x => x != null) : [];
  const title = (data, label) => { if (!text(data)) throw new Error(`${label} is required.`); return data; };
  const sortByOrder = items => items.toSorted((a,b) => (a.order ?? 1000) - (b.order ?? 1000) || text(a.title).localeCompare(text(b.title)));
  const projects = sortByOrder(list(raw.projects).filter(p => p.hidden !== true));
  const articles = list(raw.articles).filter(a => a.published === true).toSorted((a,b) => text(b.date).localeCompare(text(a.date)) || text(a.title).localeCompare(text(b.title)));
  const assets = new Set();
  const pages = {};
  const routes = {home:'', about:'about/', projects:'projects/', skills:'skills/', writing:'writing/'};
  const fallbackNav = {home:'Home',about:'About',projects:'Projects',skills:'Skills',writing:'Writing',contact:'Contact'};
  const nav = key => text(site.navigation?.[key]) || fallbackNav[key];
  const names = new Map(projects.map(p => [p.slug, p.title]));
  const allowedStatuses = ['Built','In development','Planned','Archived'];
  const allowedCategories = ['Software','Data','Agentic AI'];

  title(site.name, 'Site name');
  title(home.headline, 'Homepage heading');
  title(home.introduction, 'Homepage introduction');
  title(about.title, 'About heading');
  title(skills.title, 'Skills heading');

  for (const collection of [projects, articles]) {
    const seen = new Set();
    for (const record of collection) {
      title(record.title, 'Entry title');
      title(record.summary, `Summary for ${record.title}`);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug ?? '') || record.slug.length > 120 || seen.has(record.slug)) {
        throw new Error(`Invalid or duplicate slug for ${record.title}.`);
      }
      seen.add(record.slug);
    }
  }
  for (const p of projects) {
    if (!allowedStatuses.includes(p.status) || !allowedCategories.includes(p.category)) throw new Error(`Invalid project status or category for ${p.title}.`);
  }

  const https = v => {
    if (!/^https:\/\/[a-z0-9]+(?:[.-][a-z0-9]+)+(?:[/?#]|$)/i.test(v ?? '') || /[\s\\]/.test(v)) return '';
    return typeof v === 'string' ? v : '';
  };
  const linkedIn = v => {
    const url = https(v);
    return /^https:\/\/(?:www\.)?linkedin\.com\/(?:posts\/[^/?#]+|feed\/update\/[^/?#]+)\/?(?:[?#].*)?$/i.test(url) ? url : '';
  };
  const emailLink = v => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v ?? '') ? 'mailto:' + v : '';
  const external = (label, url, cls = 'text-link') => url ? `<a class="${cls}" href="${esc(url)}">${esc(label)}</a>` : '';
  const iconPaths = {
    LinkedIn: '<path d="M20.45 2H3.55C2.7 2 2 2.67 2 3.5v17c0 .83.7 1.5 1.55 1.5h16.9c.85 0 1.55-.67 1.55-1.5v-17c0-.83-.7-1.5-1.55-1.5ZM8 19H5V9.5h3V19ZM6.5 8.2a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 19h-3v-4.6c0-1.1-.02-2.5-1.53-2.5-1.53 0-1.77 1.2-1.77 2.43V19h-3V9.5h2.87v1.3h.04a3.15 3.15 0 0 1 2.83-1.55c3.03 0 3.56 2 3.56 4.57V19Z"/>',
    GitHub: '<path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.25.77-.54 0-.27-.01-1.16-.02-2.1-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.62 1.22 3.26.93.1-.73.39-1.22.71-1.5-2.5-.29-5.12-1.25-5.12-5.56 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.1-2.98 0 0 .94-.3 3.09 1.15a10.8 10.8 0 0 1 5.63 0c2.15-1.45 3.09-1.15 3.09-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.77 1.04.77 2.1l-.01 3.09c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z"/>'
  };
  const icon = label => `<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true" focusable="false">${iconPaths[label]}</svg>`;
  const profilePairs = [['LinkedIn','linkedin'],['GitHub','github'],['Naukri','naukri'],['Work at a Startup','workAtAStartup']];
  function profileIcons() {
    return profilePairs.slice(0,2).map(([label,key]) => {
      const url = https(site.profiles?.[key]);
      return url ? `<a class="profile-icon" href="${esc(url)}" title="${label}" aria-label="${label} profile">${icon(label)}</a>`
        : review ? `<a class="profile-icon pending-profile" href="${cms}" title="Add ${label} profile in Pages CMS" aria-label="Add ${label} profile in Pages CMS">${icon(label)}</a>` : '';
    }).join('');
  }
  function footer(link) {
    const profiles = [...profilePairs.map(([label,key]) => [label,site.profiles?.[key]]), ...list(site.profiles?.additional).map(p => [p.label,p.url])];
    return `<footer class="site-footer" id="contact" tabindex="-1" aria-labelledby="contact-heading"><div class="wrap">
      <div class="footer-contact"><div><h2 id="contact-heading">${esc(site.contactHeading || nav('contact'))}</h2>${text(site.contactDescription) ? `<p>${esc(site.contactDescription)}</p>` : ''}</div>
      ${external(site.email,emailLink(site.email),'footer-email')}</div>
      <div class="footer-bottom"><span>${esc(site.name)}</span><ul class="profile-links">
      <li><a class="text-link" href="${link(routes.writing)}">${esc(nav('writing'))}</a></li>
      ${profiles.map(([label,url],i) => text(label) && https(url) ? `<li>${external(label,https(url))}</li>` : review && i<3 ? `<li>${external(label,cms,'text-link pending-profile')}</li>` : '').join('')}
      ${review ? `<li>${external('Open Pages CMS',cms,'text-link cms-link')}</li>` : ''}</ul></div></div></footer>`;
  }
  const routeName = p => `projects/${p.slug}/`;
  const articleName = a => `writing/${a.slug}/`;
  function localized(route) {
    const parentCount = route.split('/').filter(Boolean).length;
    const prefix = '../'.repeat(parentCount);
    return path => esc(prefix + (path.endsWith('/') || !path ? path + 'index.html' : path));
  }
  function asset(path, type) {
    const imagePattern = /^\/media\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_.-]*\.(?:avif|jpe?g|png|webp)$/i;
    const docPattern = /^\/documents\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_.-]*\.pdf$/i;
    if (!(type === 'document' ? docPattern : imagePattern).test(path)) throw new Error(`Unsupported media path: ${path}`);
    assets.add(path.slice(1));
    return path.slice(1);
  }
  function image(data, link, cls = '', eager = false) {
    if (!data?.src) return '';
    title(data.alt, `Alternative text for ${data.src}`);
    return `<img${cls ? ` class="${cls}"` : ''} src="${link(asset(data.src,'image'))}" alt="${esc(data.alt)}" loading="${eager?'eager':'lazy'}" decoding="async">`;
  }
  function paragraphs(v) {
    return text(v).split(/\r?\n\s*\r?\n/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  }
  const intro = (label,description) => `<header class="page-intro"><h1>${esc(label)}</h1>${text(description)?`<p class="lead">${esc(description)}</p>`:''}</header>`;
  const pill = status => `<span class="project-status">${esc(status)}</span>`;
  const meta = p => `<div class="project-meta"><span>${esc(p.category)}</span>${pill(p.status)}</div>`;
  const cmsHelp = (label, cls = 'media-placeholder') => review ? `<p class="${cls}">${external(label,cms)}</p>` : '';
  function projectLinks(p, detail = false) {
    const repo = https(p.repository);
    const actions = [[/^https:\/\/(?:www\.)?github\.com\//i.test(repo) ? 'View on GitHub' : 'View source code',repo],
      ['Visit website', p.website], ['Live demo', p.demo]];
    if (detail) actions.push(['Documentation',p.documentation],['Demo video',p.video]);
    const links = actions.map(([label,url]) => https(url) ? `<li><a class="project-link" href="${esc(https(url))}" aria-label="${esc(`${label} · ${p.title}`)}">${label}</a></li>`:'').join('');
    return links ? `<ul class="project-links" aria-label="Project links">${links}</ul>` : detail ? cmsHelp('Add project links in Pages CMS','project-links-note') : '';
  }
  function card(p, link, featured) {
    return `<article class="project-preview${featured?' featured-project':''}">${image(p.cover,link,'project-preview-image')}
      ${meta(p)}<h3><a href="${link(routeName(p))}">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p>${projectLinks(p)}</article>`;
  }
  function linkedInSection(link) {
    if (home.showLinkedIn === false) return '';
    const posts = sortByOrder(list(raw.posts).filter(p => p.published === true && linkedIn(p.url)));
    if (!posts.length && !review) return '';
    return `<section class="section-frame linkedin-section" aria-labelledby="linkedin-heading"><div class="section-heading"><h2 id="linkedin-heading">${esc(home.linkedinTitle || 'Featured LinkedIn posts')}</h2></div>
      ${posts.length ? `<div class="linkedin-cards">${posts.map(post => {
        title(post.title,'LinkedIn post title');
        const photos = [post.image,...list(post.photos)].filter(p=>p?.src).filter((p,i,a)=>a.findIndex(q=>q.src===p.src)===i).slice(0,4);
        return `<article class="linkedin-card"><a href="${esc(linkedIn(post.url))}">
          ${photos.length ? `<div class="linkedin-photos" data-count="${photos.length}">${photos.map(p=>image(p,link)).join('')}</div>` : ''}
          <div class="linkedin-copy"><span class="linkedin-brand">${icon('LinkedIn')} LinkedIn</span><h3>${esc(post.title)}</h3>
          ${text(post.excerpt) ? `<p>${esc(post.excerpt)}</p>` : ''}<span class="linkedin-read">Read on LinkedIn</span></div>
          </a></article>`;
      }).join('')}</div>` : cmsHelp('Add a featured LinkedIn post in Pages CMS','linkedin-empty')}</section>`;
  }
  function homepage(link) {
    const featured = projects.filter(p => p.featured === true);
    const more = home.showMoreProjects === true ? projects.filter(p => !p.featured) : [];
    const hero = image(home.heroImage,link,'hero-image',true);
    return `<section class="hero wrap${hero?'':' hero-text-only'}"><div class="hero-copy">
    <h1>${esc(home.headline)}</h1>${text(site.location) ? `<p class="location">${esc(site.location)}</p>`:''}
    <p class="hero-intro">${esc(home.introduction)}</p>
    <div class="hero-actions"><a class="button" href="${link(routes.projects)}">View projects</a><a class="text-link" href="${link(routes.about)}">About me</a></div></div>
    ${hero ? `<figure class="hero-visual">${hero}${text(home.heroImage.caption) ? `<figcaption>${esc(home.heroImage.caption)}</figcaption>`:''}</figure>`:cmsHelp('Upload a homepage image in Pages CMS')}</section>
    <div class="wrap">
    ${home.showProjects !== false && featured.length ? `<section class="section-frame selected" aria-labelledby="selected-heading"><div class="section-heading"><div><h2 id="selected-heading">${esc(home.projectsTitle || 'Featured projects')}</h2>
    ${text(home.projectsDescription)?`<p>${esc(home.projectsDescription)}</p>`:''}</div>${more.length?'':`<a class="text-link" href="${link(routes.projects)}">All projects</a>`}</div>
    <div class="featured-list">${featured.map(p=>card(p,link,true)).join('')}</div></section>`:''}
    ${home.showProjects !== false && more.length ? `<section class="section-frame supporting" aria-labelledby="supporting-heading"><div class="section-heading"><h2 id="supporting-heading">${esc(home.moreProjectsTitle || 'More projects')}</h2><a class="text-link" href="${link(routes.projects)}">All projects</a></div>
    <div class="supporting-list">${more.map(p=>card(p,link,false)).join('')}</div></section>`:''}
    ${linkedInSection(link)}</div>`;
  }
  function aboutPage(link) {
    const topics = [['How I’m learning',about.learning],['What I’m building next',about.nextSteps],['Roles I’m looking for',about.roles]].filter(([,v])=>text(v));
    const portrait = image(about.portrait,link,'portrait');
    const education = list(about.education).filter(x=>text(x.title));
    const certs = list(about.certifications).filter(x=>text(x.title));
    return `<div class="wrap"><div class="about-intro${portrait?' with-portrait':''}"><div>${intro(about.title,about.introduction)}${text(about.direction)?`<div class="prose about-direction">${paragraphs(about.direction)}</div>`:''}</div>${portrait}</div>
      ${topics.length?`<section class="about-topics" aria-labelledby="about-topics-heading"><h2 id="about-topics-heading">Learning and next steps</h2>
      <div class="about-details">${topics.map(([name,body],i)=>`<details${i===0?' open':''}><summary>${esc(name)}</summary><div class="prose">${paragraphs(body)}</div></details>`).join('')}</div></section>`:''}
      ${education.length||certs.length?`<div class="about-columns section-frame">
      ${education.length?`<section aria-labelledby="education"><h2 id="education">Education</h2><ul class="record-list">${education.map(x=>`<li><h3>${esc(x.title)}</h3>${text(x.detail)?`<p>${esc(x.detail)}</p>`:''}</li>`).join('')}</ul></section>`:''}
      ${certs.length?`<section aria-labelledby="credentials"><h2 id="credentials">Certifications</h2><ul class="record-list">${certs.map(x=>`<li><h3>${esc(x.title)}</h3>${text(x.issuer)?`<p>${esc(x.issuer)}</p>`:''}${external('View credential', https(x.url))}${image(x.image,link,'credential-image')}</li>`).join('')}</ul></section>`:''}</div>`:''}</div>`;
  }
  function projectIndex(link) {
    return `<div class="wrap">${intro(nav('projects'),'Agentic AI projects in development, plus selected software, machine learning, and data work.')}
    ${projects.length?`<div class="project-index">${projects.map(p=>`<article class="index-row"><div class="index-meta">${meta(p)}</div><div class="index-copy">
    <h2><a href="${link(routeName(p))}">${esc(p.title)}</a></h2><p>${esc(p.summary)}</p>${projectLinks(p)}</div>
    ${image(p.cover,link,'index-image')}</article>`).join('')}</div>`:`<p class="empty-state">No projects published yet.</p>${cmsHelp('Add a project in Pages CMS')}`}</div>`;
  }
  function projectPage(p,link) {
    const index = projects.indexOf(p);
    const next = projects.length > 1 ? projects[(index+1)%projects.length] : null;
    const gallery = list(p.gallery).filter(x=>x.src);
    const documents = list(p.documents).filter(x=>x.src && text(x.title));
    const tools = list(p.tools).filter(text);
    const sections = list(p.sections).filter(x=>text(x.title)&&text(x.body));
    const isBuilding = p.status === 'In development' || p.status === 'Planned';
    return `<article class="wrap case-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a class="text-link" href="${link(routes.projects)}">${esc(nav('projects'))}</a><span aria-hidden="true">/</span><span>${esc(p.category)}</span></nav>
    <header class="case-intro">${pill(p.status)}<h1>${esc(p.title)}</h1><p class="lead">${esc(p.summary)}</p>${projectLinks(p,true)}</header>
    ${image(p.cover,link,'case-cover',true)}
    <div class="case-body"><div class="prose">${text(p.contribution)?`<section><h2>${isBuilding?'What I’m exploring':'My contribution'}</h2>${paragraphs(p.contribution)}</section>`:''}
    ${sections.map(s=>`<section><h2>${esc(s.title)}</h2>${paragraphs(s.body)}</section>`).join('')}</div>
    ${tools.length?`<aside class="case-tools" aria-labelledby="tools"><h2 id="tools">${isBuilding?'Technical focus':'Tools used'}</h2><ul>${tools.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></aside>`:''}</div>
    ${gallery.length||documents.length||review?`<section class="case-gallery" aria-labelledby="gallery-title"><h2 id="gallery-title">Project media and documents</h2>
    ${gallery.length?`<div class="gallery-grid">${gallery.map(x=>`<figure>${image(x,link)}${text(x.caption)?`<figcaption>${esc(x.caption)}</figcaption>`:''}</figure>`).join('')}</div>`:''}
    ${documents.length?`<ul class="project-documents">${documents.map(x=>`<li><a class="project-link" href="${link(asset(x.src,'document'))}" download>${esc(x.title)} <span class="document-format">PDF</span></a></li>`).join('')}</ul>`:''}
    ${!gallery.length&&!documents.length?cmsHelp('Add photos or PDFs in Pages CMS'):''}</section>`:''}
    ${next?`<div class="next-project"><span>Next project</span><a href="${link(routeName(next))}">${esc(next.title)}</a></div>`:''}</article>`;
  }
  function skillsPage(link) {
    return `<div class="wrap">${intro(skills.title,skills.introduction)}<div class="skill-groups">${list(skills.groups).filter(g=>text(g.title)&&list(g.items).some(i=>text(i.title))).map(g=>`<section class="skill-group">
    <h2>${esc(g.title)}</h2><ul class="skill-list">${list(g.items).filter(i=>text(i.title)).map(i=>`<li><h3>${esc(i.title)}</h3>${text(i.description)?`<p>${esc(i.description)}</p>`:''}
    ${names.has(i.project)?`<a class="text-link" href="${link(`projects/${i.project}/`)}">${esc(names.get(i.project))}</a>`:''}</li>`).join('')}</ul></section>`).join('')}</div></div>`;
  }
  function writingPage(link) {
    return `<div class="wrap">${intro(nav('writing'),writing.introduction)}${articles.length?`<div class="post-list">${articles.map(a=>`<article class="post-row">
    ${image(a.cover,link,'post-image')}<div><h2><a href="${link(articleName(a))}">${esc(a.title)}</a></h2><p>${esc(a.summary)}</p></div></article>`).join('')}</div>`:`<p class="empty-state">${esc(writing.emptyMessage || 'No articles published yet.')}</p>${cmsHelp('Create an article in Pages CMS')}`}</div>`;
  }
  function articlePage(a,link) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(a.date??'') && Number.isFinite(Date.parse(a.date)) ? a.date : '';
    return `<article class="wrap case-page"><nav class="breadcrumbs" aria-label="Breadcrumb"><a class="text-link" href="${link(routes.writing)}">${esc(nav('writing'))}</a></nav>${intro(a.title,a.summary)}
    ${date?`<p class="article-date"><time datetime="${esc(date)}">${esc(new Intl.DateTimeFormat('en-IN',{dateStyle:'long',timeZone:'UTC'}).format(new Date(date)))}</time></p>`:''}
    ${image(a.cover,link,'case-cover',true)}<div class="prose article-body">${list(a.blocks).map(b=>{
      if(b.kind==='Heading') return text(b.text)?`<h2>${esc(b.text)}</h2>`:'';
      if(b.kind==='Code') return text(b.text)?`<pre><code>${esc(b.text)}</code></pre>`:'';
      if(b.kind==='Image') return b.image?.src?`<figure>${image(b.image,link)}${text(b.image.caption)?`<figcaption>${esc(b.image.caption)}</figcaption>`:''}</figure>`:'';
      if(b.kind==='Link') return text(b.text)?external(b.text,https(b.url)):'';
      return paragraphs(b.text);
    }).join('')}</div></article>`;
  }
  function add(route, pageTitle, body, description, cover) {
    const link = localized(route);
    const active = route.split('/')[0] || 'home';
    const titleText = route ? `${pageTitle} | ${site.name}` : `${site.name} | Engineering Portfolio`;
    const address = https(opts.baseUrl ?? '').split(/[?#]/)[0].replace(/\/+$/, '');
    const canonical = address && `${address}/${route}`;
    const social = cover?.src ? cover : site.socialImage;
    const shareImage = canonical && social?.src ? `${address}/${asset(social.src,'image')}` : '';
    pages[`${route}index.html`] = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(description || site.description)}"><meta name="theme-color" content="#fbfaf8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self' file:; img-src 'self' file:; font-src 'self' file:; form-action 'none'; base-uri 'none'; object-src 'none'">
${review?'<meta name="robots" content="noindex, nofollow">':''}<title>${esc(titleText)}</title>
${canonical?`<link rel="canonical" href="${esc(canonical)}"><meta property="og:url" content="${esc(canonical)}">`:''}
<meta property="og:title" content="${esc(titleText)}"><meta property="og:description" content="${esc(description||site.description)}">
<meta property="og:type" content="${route.startsWith('writing/')&&route!==routes.writing?'article':'website'}">
${shareImage?`<meta property="og:image" content="${esc(shareImage)}"><meta property="og:image:alt" content="${esc(social.alt)}">`:''}
<link rel="icon" href="${link('assets/mark.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${link('assets/site.css')}"></head>
<body><a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap header-inner">
<nav aria-label="Main navigation"><ul class="main-nav">${Object.entries(routes).map(([key,path])=>`<li><a href="${link(path)}"${route===path?' aria-current="page"':active===key?' aria-current="location"':''}>${esc(nav(key))}</a></li>`).join('')}</ul></nav>
<div class="header-actions">${profileIcons()}<a class="header-contact text-link" href="#contact">${esc(nav('contact'))}</a></div></div></header>
<main id="main" tabindex="-1">${body(link)}</main>${footer(link)}</body></html>\n`;
  }
  add('',site.name,homepage);
  add(routes.about,nav('about'),aboutPage,about.introduction);
  add(routes.projects,nav('projects'),projectIndex);
  add(routes.skills,nav('skills'),skillsPage,skills.introduction);
  add(routes.writing,nav('writing'),writingPage,writing.introduction);
  for(const p of projects) add(routeName(p),p.title,link=>projectPage(p,link),p.summary,p.cover);
  for(const a of articles) add(articleName(a),a.title,link=>articlePage(a,link),a.summary,a.cover);
  return {pages,assets:[...assets]};
}
