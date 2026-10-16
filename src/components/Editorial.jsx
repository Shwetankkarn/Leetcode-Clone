
import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Loader2,
  Minimize2,
} from "lucide-react";

const Editorial = ({ secureUrl, thumbnailUrl, duration }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [videoError, setVideoError] = useState("");

  const storageKey = `video-progress-${secureUrl || "default"}`;

  const formatTime = (time) => {
    if (!Number.isFinite(time) || time < 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !secureUrl) return;

    if (!video.paused) {
      video.pause();
      return;
    }

    try {
      setVideoError("");
      setIsLoading(true);
      await video.play();
    } catch (error) {
      console.error("Video playback failed:", error);
      setIsPlaying(false);
      setIsLoading(false);
      setVideoError(
        "Unable to play this video. Check the video URL, format, or hosting permissions."
      );
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    setCurrentTime(video.currentTime);
    setProgress((video.currentTime / video.duration) * 100);

    try {
      localStorage.setItem(storageKey, String(video.currentTime));
    } catch (error) {
      console.warn("Could not save video progress:", error);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setVideoDuration(video.duration || 0);
    setIsLoading(false);

    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (
        Number.isFinite(saved) &&
        saved > 0 &&
        saved < video.duration
      ) {
        video.currentTime = saved;
      }
    } catch (error) {
      console.warn("Could not restore video progress:", error);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );

    video.currentTime = percent * video.duration;
  };

  const handleVolume = (e) => {
    const value = Number(e.target.value);
    const video = videoRef.current;

    setVolume(value);
    setIsMuted(value === 0);

    if (video) {
      video.volume = value;
      video.muted = value === 0;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.load();
    setIsPlaying(false);
    setIsLoading(Boolean(secureUrl));
    setVideoError("");
    setProgress(0);
    setCurrentTime(0);
    setVideoDuration(0);
  }, [secureUrl]);

  useEffect(() => {
    const handleKey = (e) => {
      const tag = e.target?.tagName;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(tag) ||
        e.target?.isContentEditable
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowRight") {
        video.currentTime = Math.min(
          video.duration || 0,
          video.currentTime + 5
        );
      } else if (e.code === "ArrowLeft") {
        video.currentTime = Math.max(0, video.currentTime - 5);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [secureUrl]);

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const timeout = setTimeout(() => setShowControls(false), 2500);
    return () => clearTimeout(timeout);
  }, [isPlaying, currentTime]);

  if (!secureUrl) {
    return (
      <div className="p-6 text-amber-400">
        No video URL is available for this editorial.
      </div>
    );
  }

  return (
    <div className="relative p-4">
      {isPlaying && thumbnailUrl && (
        <div
          className="absolute inset-0 blur-3xl opacity-30 scale-110"
          style={{
            backgroundImage: `url("${thumbnailUrl}")`,
            backgroundSize: "cover",
          }}
        />
      )}

      <motion.div
        ref={containerRef}
        className={`relative w-full max-w-5xl mx-auto rounded-2xl overflow-hidden bg-black shadow-2xl group aspect-video ${
          isMiniPlayer ? "fixed bottom-4 right-4 w-80 z-50" : ""
        }`}
        onMouseMove={() => setShowControls(true)}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <video
          ref={videoRef}
          src={secureUrl}
          poster={thumbnailUrl || undefined}
          className="w-full h-full object-contain"
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => {
            setIsPlaying(true);
            setIsLoading(false);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onError={(e) => {
            const video = e.currentTarget;
            console.error("Video element error:", {
              url: secureUrl,
              code: video.error?.code,
              message: video.error?.message,
            });
            setIsLoading(false);
            setIsPlaying(false);
            setVideoError(
              `Video failed to load (error ${
                video.error?.code ?? "unknown"
              }). Check the video URL and hosting settings.`
            );
          }}
        />

        {!isPlaying && !videoError && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
            aria-label="Play video"
          >
            <span className="rounded-full bg-white/20 backdrop-blur-lg p-4">
              <Play className="text-white" size={32} />
            </span>
          </button>
        )}

        <AnimatePresence>
          {isLoading && !videoError && (
            <motion.div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <Loader2 className="animate-spin text-white" size={32} />
            </motion.div>
          )}
        </AnimatePresence>

        {videoError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
            <p className="text-red-400">{videoError}</p>
            <button
              type="button"
              onClick={() => {
                setVideoError("");
                setIsLoading(true);
                videoRef.current?.load();
              }}
              className="rounded-lg bg-slate-700 px-4 py-2 text-white"
            >
              Retry
            </button>
          </div>
        )}

        <AnimatePresence>
          {showControls && !videoError && (
            <motion.div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-4">
              <div
                className="mb-3 h-1 w-full cursor-pointer rounded bg-white/20"
                onClick={handleSeek}
                role="slider"
                aria-label="Video progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className="h-full rounded bg-red-500"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? <Pause /> : <Play />}
                  </button>

                  <span className="text-sm">
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </span>

                  <button type="button" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? <VolumeX /> : <Volume2 />}
                  </button>

                  <input
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="w-20"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <select
                    aria-label="Playback speed"
                    value={playbackRate}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      setPlaybackRate(rate);
                      if (videoRef.current) {
                        videoRef.current.playbackRate = rate;
                      }
                    }}
                    className="rounded bg-black/50"
                  >
                    <option value={1}>1x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsMiniPlayer((value) => !value)}
                    aria-label="Toggle mini player"
                  >
                    <Minimize2 />
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Toggle fullscreen"
                  >
                    <Maximize />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isPlaying && duration && !videoError && (
          <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            {duration}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Editorial;
