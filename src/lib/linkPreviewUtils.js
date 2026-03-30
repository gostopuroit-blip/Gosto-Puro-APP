export const extractUrlFromText = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches ? matches[0] : null;
};

export const fetchLinkPreview = async (url) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const getMetaContent = (property) => {
      const el = doc.querySelector(`meta[property="${property}"]`) ||
                 doc.querySelector(`meta[name="${property}"]`);
      return el?.getAttribute("content") || null;
    };

    const title = getMetaContent("og:title") || 
                  doc.querySelector("title")?.textContent || 
                  null;
    const description = getMetaContent("og:description") ||
                       doc.querySelector("meta[name='description']")?.getAttribute("content") ||
                       null;
    const image = getMetaContent("og:image") || null;

    const domain = new URL(url).hostname.replace("www.", "");

    return {
      url,
      title: title?.slice(0, 100) || null,
      description: description?.slice(0, 150) || null,
      image: image,
      domain,
    };
  } catch (error) {
    console.warn("Failed to fetch link preview:", error);
    return null;
  }
};