import { useState, useRef, useEffect } from "react";

interface Task {
	id: number;
	text: string;
	completed: boolean;
	entering?: boolean;
}

let idCounter = 1;

const Todo = () => {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [inputValue, setInputValue] = useState<string>("");
	const [removingIds, setRemovingIds] = useState<Set<number>>(() => new Set());
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const addTask = (): void => {
		const trimmed = inputValue.trim();
		if (!trimmed) return;
		const newTask: Task = { id: idCounter++, text: trimmed, completed: false, entering: true };
		setTasks((prev) => [...prev, newTask]);
		setInputValue("");
		window.setTimeout(() => {
			setTasks((prev) => prev.map((t) => (t.id === newTask.id ? { ...t, entering: false } : t)));
		}, 20);
	};

	const toggleTask = (id: number): void => {
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
	};

	const removeTask = (id: number): void => {
		setRemovingIds((prev) => new Set(prev).add(id));
		window.setTimeout(() => {
			setTasks((prev) => prev.filter((t) => t.id !== id));
			setRemovingIds((prev) => {
				const next = new Set(prev);
				next.delete(id);
				return next;
			});
		}, 260);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === "Enter") addTask();
	};

	const remaining = tasks.filter((t) => !t.completed).length;
	const today = new Date().toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="todo-page">
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap');

        html, body, #root {
          height: 100%;
        }

        .todo-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: #EDEFE5;
          color: #262B1E;
          font-family: 'Inter', system-ui, sans-serif;
          box-sizing: border-box;
        }
        .todo-page * {
          box-sizing: border-box;
        }

        .todo-container {
          flex: 1;
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          padding: 56px 24px 40px;
        }

        .todo-date {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6E7460;
          margin: 0 0 8px;
        }

        .todo-title {
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 600;
          font-size: 40px;
          margin: 0 0 32px;
          line-height: 1.1;
        }

        .todo-input-row {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .todo-input {
          flex: 1;
          border: none;
          border-bottom: 2px solid #C9CDB8;
          background: transparent;
          padding: 8px 4px;
          font-size: 16px;
          font-family: 'Inter', system-ui, sans-serif;
          color: #262B1E;
        }
        .todo-input::placeholder {
          color: #6E7460;
        }
        .todo-input:focus {
          outline: none;
          border-color: #3B5578;
        }

        .todo-add-btn {
          background: #3B5578;
          color: #F2F4EF;
          border: none;
          border-radius: 6px;
          padding: 8px 20px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', system-ui, sans-serif;
          cursor: pointer;
          transition: transform 120ms ease;
        }
        .todo-add-btn:active {
          transform: scale(0.96);
        }
        .todo-add-btn:focus-visible {
          outline: 2px solid #3B5578;
          outline-offset: 2px;
        }

        .todo-list-area {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .todo-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-style: italic;
          color: #6E7460;
          text-align: center;
        }

        .todo-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #C9CDB8;
          transition: opacity 260ms ease, transform 260ms ease, max-height 260ms ease, margin 260ms ease, padding 260ms ease;
          max-height: 80px;
        }
        .todo-row.entering {
          opacity: 0;
          transform: translateY(-8px);
        }
        .todo-row.leaving {
          opacity: 0;
          transform: translateX(14px);
          max-height: 0;
          margin: 0 !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        .todo-check {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #C9CDB8;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          cursor: pointer;
          transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
        }
        .todo-check:active {
          transform: scale(0.9);
        }
        .todo-check.done {
          background: #3B5578;
          border-color: #3B5578;
        }
        .todo-check:focus-visible {
          outline: 2px solid #3B5578;
          outline-offset: 2px;
        }

        .todo-checkmark {
          transition: transform 200ms cubic-bezier(.34,1.56,.64,1), opacity 140ms ease;
        }

        .todo-text-wrap {
          position: relative;
          flex: 1;
          min-width: 0;
        }

        .todo-text {
          font-size: 15px;
          line-height: 1.4;
          word-break: break-word;
          color: #262B1E;
          transition: color 220ms ease, opacity 220ms ease;
        }
        .todo-text.done {
          color: #6E7460;
          opacity: 0.75;
        }

        .todo-strike {
          position: absolute;
          left: 0;
          top: 50%;
          height: 1px;
          background: #6E7460;
          width: 0%;
          transition: width 300ms ease;
        }
        .todo-strike.done {
          width: 100%;
        }

        .todo-remove {
          flex-shrink: 0;
          background: transparent;
          border: none;
          font-size: 12px;
          font-weight: 500;
          font-family: 'Inter', system-ui, sans-serif;
          color: #A14B3D;
          padding: 4px;
          cursor: pointer;
          opacity: 0;
          transform: translateX(-4px);
          transition: opacity 150ms ease, transform 150ms ease;
        }
        .todo-row:hover .todo-remove,
        .todo-row:focus-within .todo-remove {
          opacity: 1;
          transform: translateX(0);
        }
        .todo-remove:focus-visible {
          outline: 2px solid #3B5578;
          outline-offset: 2px;
          opacity: 1;
        }

        .todo-footer {
          padding-top: 24px;
          margin-top: 8px;
          font-size: 12px;
          color: #6E7460;
        }

        @media (prefers-reduced-motion: reduce) {
          .todo-row, .todo-checkmark, .todo-text, .todo-strike, .todo-remove, .todo-add-btn, .todo-check {
            transition: none !important;
          }
        }
      `}</style>

			<div className="todo-container">
				<header>
					<p className="todo-date">{today}</p>
					<h1 className="todo-title">Today&rsquo;s list</h1>
				</header>

				<div className="todo-input-row">
					<input
						ref={inputRef}
						className="todo-input"
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Add something to do"
					/>
					<button className="todo-add-btn" onClick={addTask}>
						Add
					</button>
				</div>

				<div className="todo-list-area">
					{tasks.length === 0 ? (
						<p className="todo-empty">Nothing on the list yet — add your first task above.</p>
					) : (
						tasks.map((t) => {
							const isLeaving = removingIds.has(t.id);
							const rowClass = `todo-row${t.entering ? " entering" : ""}${isLeaving ? " leaving" : ""}`;

							return (
								<div key={t.id} className={rowClass}>
									<button
										className={`todo-check${t.completed ? " done" : ""}`}
										onClick={() => toggleTask(t.id)}
										aria-label={t.completed ? "Mark as not done" : "Mark as done"}
									>
										<svg
											className="todo-checkmark"
											width={11}
											height={9}
											viewBox="0 0 12 10"
											style={{
												transform: t.completed ? "scale(1)" : "scale(0)",
												opacity: t.completed ? 1 : 0,
											}}
										>
											<path
												d="M1 5 L4.2 8.2 L11 1"
												fill="none"
												stroke="#F2F4EF"
												strokeWidth={2}
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</button>

									<span className="todo-text-wrap">
										<span className={`todo-text${t.completed ? " done" : ""}`}>{t.text}</span>
										<span className={`todo-strike${t.completed ? " done" : ""}`} />
									</span>

									<button
										className="todo-remove"
										onClick={() => removeTask(t.id)}
										aria-label="Remove task"
									>
										Remove
									</button>
								</div>
							);
						})
					)}
				</div>

				{tasks.length > 0 && (
					<footer className="todo-footer">
						{remaining === 0 ? "All done for today." : `${remaining} task${remaining === 1 ? "" : "s"} remaining`}
					</footer>
				)}
			</div>
		</div>
	);
};

export default Todo;
