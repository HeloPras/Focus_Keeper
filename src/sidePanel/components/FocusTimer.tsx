import { useState, useEffect, useRef } from "react";

interface PomodoroTimerProps {
	/** Domains to block while focus mode is running (for links/buttons inside your own app). */
	restrictedSites?: string[];
	/** Called whenever a focus session completes. Use this to persist history to your own store. */
	onSessionComplete?: (durationMinutes: number, completedAt: Date) => void;
}

const MIN_MINUTES = 5;
const MAX_MINUTES = 90;
const STEP_MINUTES = 5;

const PomodoroTimer = ({ restrictedSites = [], onSessionComplete }: PomodoroTimerProps) => {
	const [durationMinutes, setDurationMinutes] = useState<number>(25);
	const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
	const [isRunning, setIsRunning] = useState<boolean>(false);
	const [sessionsToday, setSessionsToday] = useState<number>(0);
	const [blockedAttempt, setBlockedAttempt] = useState<string | null>(null);
	const intervalRef = useRef<number | null>(null);

	const isFocusMode = isRunning;

	useEffect(() => {
		if (isRunning) {
			intervalRef.current = window.setInterval(() => {
				setSecondsLeft((prev) => {
					if (prev <= 1) {
						window.clearInterval(intervalRef.current ?? undefined);
						setIsRunning(false);
						setSessionsToday((s) => s + 1);
						onSessionComplete?.(durationMinutes, new Date());
						return durationMinutes * 60;
					}
					return prev - 1;
				});
			}, 1000);
		} else if (intervalRef.current) {
			window.clearInterval(intervalRef.current);
		}
		return () => {
			if (intervalRef.current) window.clearInterval(intervalRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isRunning]);

	useEffect(() => {
		if (!isRunning) setSecondsLeft(durationMinutes * 60);
	}, [durationMinutes, isRunning]);

	const adjustDuration = (delta: number): void => {
		if (isRunning) return;
		setDurationMinutes((prev) => {
			const next = prev + delta;
			return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, next));
		});
	};

	const toggleRunning = (): void => setIsRunning((prev) => !prev);

	const resetTimer = (): void => {
		setIsRunning(false);
		setSecondsLeft(durationMinutes * 60);
	};

	const minutes = Math.floor(secondsLeft / 60);
	const seconds = secondsLeft % 60;
	const progress = 1 - secondsLeft / (durationMinutes * 60);

	/** Demo hook: call this from any link/button in your app before navigating. */
	const guardNavigation = (url: string): boolean => {
		if (!isFocusMode) return true;
		const isRestricted = restrictedSites.some((site) => url.includes(site));
		if (isRestricted) {
			setBlockedAttempt(url);
			window.setTimeout(() => setBlockedAttempt(null), 2500);
			return false;
		}
		return true;
	};

	return (
		<div className="pomo-widget">
			<style>{`
        .pomo-widget {
          margin-top: auto;
          width: 100%;
          font-family: 'Inter', system-ui, sans-serif;
          box-sizing: border-box;
        }
        .pomo-widget * {
          box-sizing: border-box;
        }

        .pomo-card {
			position:sticky;
			bottom:0;
          background: #1E2126;
          border-radius: 10px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pomo-card.focus {
          box-shadow: 0 0 0 1.5px #3B5578;
        }

        .pomo-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .pomo-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #8B909A;
        }
        .pomo-label.focus {
          color: #F2A65A;
        }

        .pomo-sessions {
          font-size: 11px;
          color: #6b7078;
        }

        .pomo-main-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pomo-ring {
          position: relative;
          width: 46px;
          height: 46px;
          flex-shrink: 0;
        }
        .pomo-ring svg {
          transform: rotate(-90deg);
        }
        .pomo-ring-bg {
          fill: none;
          stroke: #2A2E35;
          stroke-width: 4;
        }
        .pomo-ring-fg {
          fill: none;
          stroke: #F2A65A;
          stroke-width: 4;
          stroke-linecap: round;
          transition: stroke-dashoffset 900ms linear;
        }

        .pomo-time {
          font-size: 20px;
          font-weight: 600;
          color: #EDEEF0;
          font-variant-numeric: tabular-nums;
          min-width: 58px;
        }

        .pomo-adjust {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: auto;
        }
        .pomo-adjust-btn {
          width: 22px;
          height: 22px;
          border-radius: 5px;
          border: 1px solid #2A2E35;
          background: #16181B;
          color: #8B909A;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 150ms ease, border-color 150ms ease;
        }
        .pomo-adjust-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .pomo-adjust-btn:not(:disabled):hover {
          border-color: #3B5578;
          color: #EDEEF0;
        }

        .pomo-controls {
          display: flex;
          gap: 8px;
        }
        .pomo-btn {
          flex: 1;
          border: none;
          border-radius: 6px;
          padding: 7px 0;
          font-size: 12.5px;
          font-weight: 600;
          font-family: 'Inter', system-ui, sans-serif;
          cursor: pointer;
          transition: transform 120ms ease, background-color 150ms ease;
        }
        .pomo-btn:active {
          transform: scale(0.96);
        }
        .pomo-btn-primary {
          background: #F2A65A;
          color: #16181B;
        }
        .pomo-btn-secondary {
          background: transparent;
          border: 1px solid #2A2E35;
          color: #8B909A;
        }
        .pomo-btn-secondary:hover {
          color: #EDEEF0;
        }

        .pomo-blocked {
          font-size: 11px;
          color: #C1655A;
          background: rgba(193, 101, 90, 0.1);
          border: 1px solid rgba(193, 101, 90, 0.3);
          border-radius: 5px;
          padding: 6px 8px;
          animation: pomoShake 300ms ease;
        }
        @keyframes pomoShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>

			<div className={` pomo-card${isFocusMode ? " focus" : ""}`}>
				<div className="pomo-top-row">
					<span className={`pomo-label${isFocusMode ? " focus" : ""}`}>
						{isFocusMode ? "Focus mode" : "Pomodoro"}
					</span>
					<span className="pomo-sessions">{sessionsToday} today</span>
				</div>

				<div className="pomo-main-row">
					<div className="pomo-ring">
						<svg width="46" height="46" viewBox="0 0 46 46">
							<circle className="pomo-ring-bg" cx="23" cy="23" r="19" />
							<circle
								className="pomo-ring-fg"
								cx="23"
								cy="23"
								r="19"
								strokeDasharray={2 * Math.PI * 19}
								strokeDashoffset={2 * Math.PI * 19 * (1 - progress)}
							/>
						</svg>
					</div>

					<span className="pomo-time">
						{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
					</span>

					<div className="pomo-adjust">
						<button
							className="pomo-adjust-btn"
							onClick={() => adjustDuration(-STEP_MINUTES)}
							disabled={isRunning || durationMinutes <= MIN_MINUTES}
							aria-label="Decrease duration"
						>
							−
						</button>
						<button
							className="pomo-adjust-btn"
							onClick={() => adjustDuration(STEP_MINUTES)}
							disabled={isRunning || durationMinutes >= MAX_MINUTES}
							aria-label="Increase duration"
						>
							+
						</button>
					</div>
				</div>

				<div className="pomo-controls">
					<button className="pomo-btn pomo-btn-primary" onClick={toggleRunning}>
						{isRunning ? "Pause" : "Start"}
					</button>
					<button className="pomo-btn pomo-btn-secondary" onClick={resetTimer}>
						Reset
					</button>
				</div>

				{blockedAttempt && (
					<div className="pomo-blocked">Blocked while focusing: {blockedAttempt}</div>
				)}
			</div>
		</div>
	);
};

export default PomodoroTimer;
export type { PomodoroTimerProps };
