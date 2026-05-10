import Nav from '@/components/Nav'
import TimerTool from './TimerTool'

export const metadata = {
  title: 'Timer & Countdown',
  description:
    'Free stopwatch and countdown timer for cooking, Pomodoro work sessions, exercise, prayer, and more.',
}

export default function TimerPage() {
  return (
    <main>
      <Nav />
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <article style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(40px, 6vw, 64px) 24px 80px', color: '#D4D4D8', fontSize: 15, lineHeight: 1.8 }}>
          <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 330, margin: '0 0 12px', letterSpacing: '-0.3px' }}>
            Timer &amp; countdown
          </h1>
          <p style={{ color: '#A1A1AA', margin: '0 0 32px' }}>
            Stopwatch for tracking elapsed time. Countdown for cooking, Pomodoro work sessions, or exercise intervals.
          </p>
          <TimerTool />
          <p style={{ color: '#71717A', fontSize: 13, marginTop: 32, lineHeight: 1.6 }}>
            Visual alert only — no sound. Keep this tab visible while the countdown is running.
          </p>
        </article>
      </div>
    </main>
  )
}
