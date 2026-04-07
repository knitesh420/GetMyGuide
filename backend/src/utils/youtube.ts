/**
 * Extracts the video ID from a YouTube URL.
 * Supports:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://youtube.com/watch?v=VIDEO_ID
 *
 * @returns The video ID string, or null if the URL is invalid.
 */
export function extractYoutubeVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
		/(?:youtu\.be\/)([\w-]{11})/,
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) {
			return match[1];
		}
	}

	return null;
}

/**
 * Returns the default YouTube thumbnail URL for a given video ID.
 */
export function getYoutubeThumbnailUrl(videoId: string): string {
	return `https://img.youtube.com/vi/${videoId}/0.jpg`;
}
