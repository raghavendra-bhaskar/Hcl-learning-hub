const PLAYABLE_VIDEO_FALLBACKS = {
  'DevOps Loop Overview': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'TeamSpace Setup': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'Value Stream Map': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'DevOps Plan Intro': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'Workitem Lifecycle': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'State Transitions': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'Plan API Integration': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'Gitea Source Control': 'https://www.youtube.com/watch?v=For9VtrQx58',
  'Pull Request Workflow': 'https://www.youtube.com/watch?v=For9VtrQx58',
  'DevOps Traceability': 'https://www.youtube.com/watch?v=dIfBc2nbq3Y',
  'CI Build Pipeline': 'https://www.youtube.com/watch?v=1er2cjUq1UI',
  'Build Agent Config': 'https://www.youtube.com/watch?v=1er2cjUq1UI',
  'Build Templates': 'https://www.youtube.com/watch?v=1er2cjUq1UI',
  'CodeStation Artifacts': 'https://www.youtube.com/watch?v=1er2cjUq1UI',
  'UrbanCode Deploy': 'https://www.youtube.com/watch?v=BxRB8v2-LEI',
  'Deploy Snapshots': 'https://www.youtube.com/watch?v=BxRB8v2-LEI',
  'Test Hub Recording': 'https://www.youtube.com/watch?v=nu_Fg-5YPJA',
  'DORA Metrics': 'https://www.youtube.com/watch?v=DgpsX5yLXQw',
  'Kubernetes StorageClass': 'https://www.youtube.com/watch?v=0swOh5C3OVM',
  'Helm Install': 'https://www.youtube.com/watch?v=MWeUQOfc-_Y',
  'Build Troubleshooting': 'https://www.youtube.com/watch?v=1er2cjUq1UI',
};

export function isYouTubeUrl(url) {
  return !!url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

export function isYouTubeSearchUrl(url) {
  return !!url && url.includes('youtube.com/results?search_query=');
}

export function isGoogleDriveUrl(url) {
  return !!url && url.includes('drive.google.com/file/d/');
}

export function isDirectVideoUrl(url) {
  return !!url && (/\.mp4($|\?)/i.test(url) || /\.webm($|\?)/i.test(url) || /\.ogg($|\?)/i.test(url) || url.includes('/videos/'));
}

export function getGoogleDrivePreviewUrl(url) {
  const match = url?.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : null;
}

function getYouTubeVideoId(url) {
  const yt = url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return yt?.[1] || null;
}

function getYouTubePlaylistId(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('list');
  } catch {
    return null;
  }
}

export function resolvePlayableUrl(resourceOrParts) {
  const resource = typeof resourceOrParts === 'string'
    ? { url: resourceOrParts }
    : (resourceOrParts || {});

  const url = resource.url?.trim?.() || resource.url || '';
  const label = resource.label?.trim?.() || resource.label || '';

  if (!url) return '';
  if (PLAYABLE_VIDEO_FALLBACKS[label]) return PLAYABLE_VIDEO_FALLBACKS[label];
  return url;
}

export function getEmbedUrl(resourceOrParts, options = {}) {
  const resource = typeof resourceOrParts === 'string'
    ? { url: resourceOrParts, type: 'link' }
    : (resourceOrParts || {});

  const autoplay = options.autoplay ? '1' : '0';
  const url = resolvePlayableUrl(resource);

  if (!url) return null;

  const videoId = getYouTubeVideoId(url);
  if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay}&rel=0`;

  if (url.includes('youtube.com/embed/')) {
    return url.includes('?') ? `${url}&autoplay=${autoplay}` : `${url}?autoplay=${autoplay}`;
  }

  if (url.includes('youtube.com/playlist?') || url.includes('youtube.com/watch?') || url.includes('youtube.com/shorts/')) {
    const playlistId = getYouTubePlaylistId(url);
    if (playlistId) return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=${autoplay}`;
  }

  if (isGoogleDriveUrl(url)) return getGoogleDrivePreviewUrl(url);
  if (isDirectVideoUrl(url)) return url;

  return null;
}

export function canEmbedResource(resource) {
  return !!getEmbedUrl(resource);
}

export function isNativeVideoResource(resource) {
  const resolvedUrl = resolvePlayableUrl(resource);
  return resource?.type === 'video' && isDirectVideoUrl(resolvedUrl) && !isYouTubeUrl(resolvedUrl) && !isGoogleDriveUrl(resolvedUrl);
}

export function validateEmbeddableVideoResource(resource) {
  const type = resource?.type;
  const url = resource?.url?.trim?.() || resource?.url || '';

  if (!['youtube', 'playlist', 'video'].includes(type)) {
    return { valid: true, message: '' };
  }

  if (!url) {
    return { valid: false, message: 'A playable video URL is required.' };
  }

  if (isYouTubeSearchUrl(url)) {
    return { valid: false, message: 'YouTube search-result URLs are not allowed. Use a direct YouTube watch URL, playlist URL, Google Drive file URL, or MP4/WebM link.' };
  }

  if (getEmbedUrl(resource)) {
    return { valid: true, message: '' };
  }

  return { valid: false, message: 'This resource is not a supported playable video URL.' };
}
