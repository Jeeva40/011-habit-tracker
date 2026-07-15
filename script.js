/**
 * ============================================================================
 * HabitSystems — Premium Habit Tracker
 * ----------------------------------------------------------------------------
 * A single-file, framework-free ES6+ application layer that powers the
 * HabitSystems markup (index.html) and stylesheet (style.css).
 *
 * Architecture: a set of small, focused modules (namespaced object literals
 * and classes) composed together by a single App bootstrapper at the bottom
 * of the file. Everything is wrapped in an IIFE so nothing leaks onto
 * `window` except the deliberate `window.HabitSystems` debug handle.
 * ============================================================================
 */
'use strict';

(() => {
    /* ========================================================================
       1. CONFIGURATION & CONSTANTS
       ======================================================================== */

    const APP_NAME = 'HabitSystems';
    const APP_VERSION = '1.0.0';

    /** Namespaced localStorage keys — never collide with other apps on origin */
    const STORAGE_KEYS = {
        HABITS: 'habitsystems.habits',
        JOURNAL: 'habitsystems.journal',
        ACHIEVEMENTS: 'habitsystems.achievements',
        THEME: 'habitsystems.theme',
        SETTINGS: 'habitsystems.settings',
        GAMIFICATION: 'habitsystems.gamification',
        WATER: 'habitsystems.water',
        SLEEP: 'habitsystems.sleep',
        MOOD: 'habitsystems.mood',
        STATS: 'habitsystems.stats',
        DAILY_QUOTE: 'habitsystems.dailyQuote',
        NOTIFICATIONS: 'habitsystems.notifications',
        SEEDED: 'habitsystems.seeded',
    };

    /** Category → display label, icon-box CSS class, default icon & default unit */
    const CATEGORY_META = {
        health: { label: 'Health', iconBox: 'water-icon-box', icon: 'fa-glass-water', unit: 'glasses' },
        fitness: { label: 'Fitness', iconBox: 'fitness-icon-box', icon: 'fa-person-running', unit: 'session' },
        learning: { label: 'Learning', iconBox: 'reading-icon-box', icon: 'fa-book', unit: 'pages' },
        mindfulness: { label: 'Mindfulness', iconBox: 'mindfulness-icon-box', icon: 'fa-spa', unit: 'minutes' },
        nutrition: { label: 'Nutrition', iconBox: 'nutrition-icon-box', icon: 'fa-carrot', unit: 'day' },
        productivity: { label: 'Productivity', iconBox: 'xp-box', icon: 'fa-laptop-code', unit: 'minutes' },
        'personal-growth': { label: 'Personal Growth', iconBox: 'journal-icon-box', icon: 'fa-pen-nib', unit: 'entry' },
    };

    /** Icon options offered in the Add/Edit habit icon pickers */
    const ICON_OPTIONS = [
        { icon: 'fa-glass-water', label: 'Water droplet icon' },
        { icon: 'fa-person-running', label: 'Running icon' },
        { icon: 'fa-book', label: 'Book icon' },
        { icon: 'fa-spa', label: 'Spa icon' },
        { icon: 'fa-carrot', label: 'Carrot icon' },
        { icon: 'fa-pen-nib', label: 'Pen icon' },
        { icon: 'fa-dumbbell', label: 'Dumbbell icon' },
        { icon: 'fa-laptop-code', label: 'Laptop icon' },
        { icon: 'fa-bed', label: 'Bed icon' },
        { icon: 'fa-person-walking', label: 'Walking icon' },
    ];

    const XP_RULES = {
        COMPLETE_HABIT: 20,
        DAILY_GOAL: 50,
        STREAK_7: 100,
        STREAK_30: 250,
        STREAK_100: 600,
    };

    const FREQUENCY_LABELS = {
        daily: 'Daily',
        weekdays: 'Weekdays',
        weekends: 'Weekends',
        weekly: 'Weekly',
        custom: 'Custom',
    };

    const MOOD_META = {
        great: { icon: 'fa-face-laugh-beam', label: 'Great' },
        good: { icon: 'fa-face-smile', label: 'Good' },
        okay: { icon: 'fa-face-meh', label: 'Okay' },
        tired: { icon: 'fa-face-tired', label: 'Tired' },
        sad: { icon: 'fa-face-frown', label: 'Sad' },
    };

    const POMODORO_WORK_SECONDS = 25 * 60;

    /* ========================================================================
       2. UTILITY FUNCTIONS
       ======================================================================== */

    const Utils = {
        /** Generates a reasonably unique id without external dependencies */
        uid(prefix = 'id') {
            return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
        },

        /** Debounce: delays invocation until `wait` ms of silence have passed */
        debounce(fn, wait = 250) {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn(...args), wait);
            };
        },

        /** Throttle: guarantees `fn` runs at most once per `limit` ms */
        throttle(fn, limit = 250) {
            let waiting = false;
            return (...args) => {
                if (waiting) return;
                fn(...args);
                waiting = true;
                setTimeout(() => { waiting = false; }, limit);
            };
        },

        clamp(num, min, max) {
            return Math.min(Math.max(num, min), max);
        },

        /** Escapes user-supplied text before it is placed into innerHTML */
        escapeHTML(str = '') {
            const div = document.createElement('div');
            div.textContent = String(str);
            return div.innerHTML;
        },

        capitalize(str = '') {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        toISODate(date) {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        },

        addDays(date, amount) {
            const d = new Date(date);
            d.setDate(d.getDate() + amount);
            return d;
        },

        isSameDay(a, b) {
            return Utils.toISODate(a) === Utils.toISODate(b);
        },

        isApplicableDay(date, frequency) {
            const day = new Date(date).getDay();
            if (frequency === 'weekdays') return day >= 1 && day <= 5;
            if (frequency === 'weekends') return day === 0 || day === 6;
            return true;
        },

        formatFriendlyDate(date) {
            return new Date(date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            });
        },

        formatShortDate(date) {
            return new Date(date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
            });
        },

        formatTime12h(hhmm) {
            if (!hhmm) return '—';
            const [hoursRaw, minutes] = hhmm.split(':');
            let hours = parseInt(hoursRaw, 10);
            const suffix = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            return `${String(hours).padStart(2, '0')}:${minutes} ${suffix}`;
        },

        getGreeting(hour = new Date().getHours()) {
            if (hour < 12) return 'Good Morning';
            if (hour < 17) return 'Good Afternoon';
            if (hour < 21) return 'Good Evening';
            return 'Good Night';
        },

        /** Deterministic pseudo-random generator (mulberry32) for seed data */
        mulberry32(seed) {
            let s = seed;
            return () => {
                s |= 0; s = (s + 0x6D2B79F5) | 0;
                let t = Math.imul(s ^ (s >>> 15), 1 | s);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        },

        /** Simple day-of-year hash used to pick a stable "quote of the day" */
        dayOfYear(date = new Date()) {
            const start = new Date(date.getFullYear(), 0, 0);
            const diff = date - start;
            return Math.floor(diff / 86400000);
        },
    };

    /* ========================================================================
       3. STORAGE WRAPPER (resilient to corrupted / unavailable localStorage)
       ======================================================================== */

    const Storage = {
        available: (() => {
            try {
                const testKey = '__habitsystems_test__';
                window.localStorage.setItem(testKey, '1');
                window.localStorage.removeItem(testKey);
                return true;
            } catch (err) {
                console.warn(`${APP_NAME}: localStorage unavailable, falling back to memory.`, err);
                return false;
            }
        })(),

        memoryFallback: new Map(),

        get(key, fallback = null) {
            if (!Storage.available) {
                return Storage.memoryFallback.has(key) ? Storage.memoryFallback.get(key) : fallback;
            }
            try {
                const raw = window.localStorage.getItem(key);
                if (raw === null) return fallback;
                return JSON.parse(raw);
            } catch (err) {
                console.error(`${APP_NAME}: corrupted data for "${key}", resetting.`, err);
                return fallback;
            }
        },

        set(key, value) {
            if (!Storage.available) {
                Storage.memoryFallback.set(key, value);
                return true;
            }
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (err) {
                console.error(`${APP_NAME}: failed to persist "${key}".`, err);
                return false;
            }
        },

        remove(key) {
            if (!Storage.available) { Storage.memoryFallback.delete(key); return; }
            try { window.localStorage.removeItem(key); } catch (err) { /* noop */ }
        },

        clearAll() {
            Object.values(STORAGE_KEYS).forEach(Storage.remove);
        },
    };

    /* ========================================================================
       4. MOTIVATIONAL QUOTES (100+)
       ======================================================================== */

    const MOTIVATIONAL_QUOTES = [
        { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
        { text: 'Small daily improvements are the key to staggering long-term results.', author: 'James Clear' },
        { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
        { text: 'The secret of your future is hidden in your daily routine.', author: 'Mike Murdock' },
        { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Rohn' },
        { text: 'Success is the product of daily habits, not once-in-a-lifetime transformations.', author: 'James Clear' },
        { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
        { text: 'The chains of habit are too weak to be felt until they are too strong to be broken.', author: 'Samuel Johnson' },
        { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
        { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
        { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
        { text: 'You will never change your life until you change something you do daily.', author: 'Mike Murdock' },
        { text: 'Your net worth to the world is usually determined by what remains after your bad habits are subtracted.', author: 'Benjamin Franklin' },
        { text: 'Habits are the compound interest of self-improvement.', author: 'James Clear' },
        { text: 'First we make our habits, then our habits make us.', author: 'John Dryden' },
        { text: 'Every action you take is a vote for the type of person you wish to become.', author: 'James Clear' },
        { text: 'Discipline equals freedom.', author: 'Jocko Willink' },
        { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
        { text: 'What you do every day matters more than what you do once in a while.', author: 'Gretchen Rubin' },
        { text: 'Change is hard at first, messy in the middle and gorgeous at the end.', author: 'Robin Sharma' },
        { text: 'Consistency is what transforms average into excellence.', author: 'Unknown' },
        { text: 'Do something today that your future self will thank you for.', author: 'Sean Patrick Flanery' },
        { text: 'Little by little, one travels far.', author: 'J.R.R. Tolkien' },
        { text: 'The best way to predict the future is to create it.', author: 'Abraham Lincoln' },
        { text: 'Progress, not perfection.', author: 'Unknown' },
        { text: 'You do not have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
        { text: 'Setting goals is the first step in turning the invisible into the visible.', author: 'Tony Robbins' },
        { text: 'The pain of discipline weighs ounces, the pain of regret weighs tons.', author: 'Jim Rohn' },
        { text: 'Habit is a cable; we weave a thread of it daily, and at last we cannot break it.', author: 'Horace Mann' },
        { text: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
        { text: 'Success is walking from failure to failure with no loss of enthusiasm.', author: 'Winston Churchill' },
        { text: 'Well begun is half done.', author: 'Aristotle' },
        { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
        { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
        { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
        { text: 'Continuous improvement is better than delayed perfection.', author: 'Mark Twain' },
        { text: 'A river cuts through rock not because of its power, but its persistence.', author: 'James N. Watkins' },
        { text: 'Don’t watch the clock; do what it does. Keep going.', author: 'Sam Levenson' },
        { text: 'Habits form the architecture of our daily life.', author: 'Gretchen Rubin' },
        { text: 'Fall seven times, stand up eight.', author: 'Japanese Proverb' },
        { text: 'The difference between who you are and who you want to be is what you do.', author: 'Unknown' },
        { text: 'One habit at a time is enough.', author: 'Leo Babauta' },
        { text: 'Small steps in the right direction can turn out to be the biggest step of your life.', author: 'Unknown' },
        { text: 'Every habit and skill is created and strengthened through practice.', author: 'Epictetus' },
        { text: 'The greatest weapon against stress is our ability to choose one thought over another.', author: 'William James' },
        { text: 'What we plant in the soil of contemplation, we shall reap in the harvest of action.', author: 'Meister Eckhart' },
        { text: 'How we spend our days is, of course, how we spend our lives.', author: 'Annie Dillard' },
        { text: 'Your life does not get better by chance, it gets better by change.', author: 'Jim Rohn' },
        { text: 'Success is nothing more than a few simple disciplines, practiced every day.', author: 'Jim Rohn' },
        { text: 'The habit of persistence is the habit of victory.', author: 'Herbert Kaufman' },
        { text: 'You cannot cross the sea merely by standing and staring at the water.', author: 'Rabindranath Tagore' },
        { text: 'Motivation gets you going, but discipline keeps you growing.', author: 'John C. Maxwell' },
        { text: 'A goal without a plan is just a wish.', author: 'Antoine de Saint-Exupéry' },
        { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
        { text: 'Amateurs sit and wait for inspiration, the rest of us just get up and go to work.', author: 'Stephen King' },
        { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
        { text: 'You get in life what you have the courage to ask for.', author: 'Oprah Winfrey' },
        { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
        { text: 'Do not wait. The time will never be just right.', author: 'Napoleon Hill' },
        { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
        { text: 'Whatever you are, be a good one.', author: 'Abraham Lincoln' },
        { text: 'Perseverance is not a long race; it is many short races one after another.', author: 'Walter Elliot' },
        { text: 'Great things are done by a series of small things brought together.', author: 'Vincent Van Gogh' },
        { text: 'The only limit to our realization of tomorrow is our doubts of today.', author: 'Franklin D. Roosevelt' },
        { text: 'Dreams do not work unless you do.', author: 'John C. Maxwell' },
        { text: 'You are today where your thoughts have brought you.', author: 'James Allen' },
        { text: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
        { text: 'Habits are first cobwebs, then cables.', author: 'Spanish Proverb' },
        { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
        { text: 'Winners are not people who never fail, but people who never quit.', author: 'Unknown' },
        { text: 'Do the hard jobs first. The easy jobs will take care of themselves.', author: 'Dale Carnegie' },
        { text: 'Excellence is not a skill. It is an attitude.', author: 'Ralph Marston' },
        { text: 'It is not what we do once in a while that shapes our lives, but what we do consistently.', author: 'Tony Robbins' },
        { text: 'The man who moves a mountain begins by carrying away small stones.', author: 'Confucius' },
        { text: 'Habits are the small decisions you make and actions you perform every day.', author: 'Charles Duhigg' },
        { text: 'Be so good they can not ignore you.', author: 'Steve Martin' },
        { text: 'You must expect great things of yourself before you can do them.', author: 'Michael Jordan' },
        { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
        { text: 'To improve is to change; to be perfect is to change often.', author: 'Winston Churchill' },
        { text: 'Habits, once established, tend to persist.', author: 'Wendell Berry' },
        { text: 'Nothing is particularly hard if you divide it into small jobs.', author: 'Henry Ford' },
        { text: 'The chains of your habits are broken by the intention behind your actions.', author: 'Unknown' },
        { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
        { text: 'The distance between dreams and reality is called discipline.', author: 'Unknown' },
        { text: 'Success usually comes to those who are too busy to be looking for it.', author: 'Henry David Thoreau' },
        { text: 'Your future is created by what you do today, not tomorrow.', author: 'Robert Kiyosaki' },
        { text: 'People often say that motivation does not last. Well, neither does bathing. That is why we recommend it daily.', author: 'Zig Ziglar' },
        { text: 'Habit is stronger than reason.', author: 'George Santayana' },
        { text: 'A single conversation with a wise person is better than ten years of study.', author: 'Chinese Proverb' },
        { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
        { text: 'Do not let what you cannot do interfere with what you can do.', author: 'John Wooden' },
        { text: 'Discipline is the soul of an army.', author: 'George Washington' },
        { text: 'Great works are performed not by strength but by perseverance.', author: 'Samuel Johnson' },
        { text: 'You can not build a reputation on what you are going to do.', author: 'Henry Ford' },
        { text: 'The struggle you are in today is developing the strength you need for tomorrow.', author: 'Robert Tew' },
        { text: 'Habits change into character.', author: 'Ovid' },
        { text: 'The only way to achieve the impossible is to believe it is possible.', author: 'Charles Kingsleigh' },
        { text: 'Someone is sitting in the shade today because someone planted a tree a long time ago.', author: 'Warren Buffett' },
        { text: 'What you get by achieving your goals is not as important as what you become.', author: 'Zig Ziglar' },
        { text: 'Never let the fear of striking out keep you from playing the game.', author: 'Babe Ruth' },
        { text: 'The only bad workout is the one that did not happen.', author: 'Unknown' },
        { text: 'Discipline is doing what needs to be done, even if you do not want to do it.', author: 'Unknown' },
        { text: 'Character is the result of two things: mental attitude and the way we spend our time.', author: 'Elbert Hubbard' },
        { text: 'The habits you practice every day shape the person you become.', author: 'Unknown' },
        { text: 'Sow a habit and you reap a character. Sow a character and you reap a destiny.', author: 'Charles Reade' },
        { text: 'You will never always be motivated, so you must learn to be disciplined.', author: 'Unknown' },
        { text: 'A goal is a dream with a deadline.', author: 'Napoleon Hill' },
        { text: 'Continuous effort, not strength or intelligence, is the key to unlocking our potential.', author: 'Winston Churchill' },
    ];

    const QuoteService = {
        /** Returns the same quote all day, refreshing once per calendar day */
        getQuoteOfTheDay() {
            const today = Utils.toISODate(new Date());
            const cached = Storage.get(STORAGE_KEYS.DAILY_QUOTE);
            if (cached && cached.date === today) return cached.quote;
            const index = Utils.dayOfYear() % MOTIVATIONAL_QUOTES.length;
            const quote = MOTIVATIONAL_QUOTES[index];
            Storage.set(STORAGE_KEYS.DAILY_QUOTE, { date: today, quote });
            return quote;
        },
        getRandomQuote() {
            return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
        },
    };

    /* ========================================================================
       5. SAMPLE DATA (used only when localStorage is empty)
       ======================================================================== */

    function buildSampleHabits() {
        const defs = [
            { title: 'Morning Run', category: 'fitness', icon: 'fa-person-running', color: '#EF4444', goal: 1, unit: 'run', frequency: 'daily', reminder: '06:30', priority: 'high', notes: 'Aim for at least a 3km loop around the park.', favorite: true, seed: 1, hitRate: 0.78 },
            { title: 'Drink Water', category: 'health', icon: 'fa-glass-water', color: '#0EA5E9', goal: 8, unit: 'glasses', frequency: 'daily', reminder: '08:00', priority: 'medium', notes: 'Keep a bottle on the desk as a visual reminder.', favorite: false, seed: 2, hitRate: 0.82 },
            { title: 'Read 30 Minutes', category: 'learning', icon: 'fa-book', color: '#4F46E5', goal: 30, unit: 'pages', frequency: 'daily', reminder: '21:00', priority: 'medium', notes: 'Currently reading Atomic Habits.', favorite: false, seed: 3, hitRate: 0.65 },
            { title: 'Meditation', category: 'mindfulness', icon: 'fa-spa', color: '#7C3AED', goal: 10, unit: 'minutes', frequency: 'daily', reminder: '07:00', priority: 'high', notes: 'Box breathing works best in the morning.', favorite: true, seed: 4, hitRate: 0.88 },
            { title: 'Workout', category: 'fitness', icon: 'fa-dumbbell', color: '#EF4444', goal: 1, unit: 'session', frequency: 'daily', reminder: '18:00', priority: 'high', notes: 'Push/Pull/Legs rotation.', favorite: false, seed: 5, hitRate: 0.6 },
            { title: 'Coding Practice', category: 'productivity', icon: 'fa-laptop-code', color: '#4F46E5', goal: 60, unit: 'minutes', frequency: 'daily', reminder: '20:00', priority: 'medium', notes: 'Work through one algorithm problem per session.', favorite: false, seed: 6, hitRate: 0.7 },
            { title: 'Sleep Before 10 PM', category: 'health', icon: 'fa-bed', color: '#0EA5E9', goal: 1, unit: 'night', frequency: 'daily', reminder: '22:00', priority: 'medium', notes: 'Phone stays outside the bedroom.', favorite: false, seed: 7, hitRate: 0.55 },
            { title: 'No Sugar', category: 'nutrition', icon: 'fa-carrot', color: '#22C55E', goal: 1, unit: 'day', frequency: 'weekdays', reminder: null, priority: 'low', notes: 'Swap dessert for fruit.', favorite: false, seed: 8, hitRate: 0.5 },
            { title: 'Walking', category: 'fitness', icon: 'fa-person-walking', color: '#EF4444', goal: 5000, unit: 'steps', frequency: 'daily', reminder: '17:00', priority: 'low', notes: 'Take the long way back from lunch.', favorite: false, seed: 9, hitRate: 0.72 },
            { title: 'Journal Writing', category: 'personal-growth', icon: 'fa-pen-nib', color: '#F59E0B', goal: 1, unit: 'entry', frequency: 'daily', reminder: '22:00', priority: 'medium', notes: 'Three lines minimum, no editing.', favorite: false, seed: 10, hitRate: 0.6 },
        ];

        const now = new Date();
        const todayCompletedFlags = [true, true, false, true, false, true, false, false, true, false];

        return defs.map((def, index) => {
            const rand = Utils.mulberry32(def.seed);
            const completedDates = [];
            for (let i = 40; i >= 1; i -= 1) {
                if (!Utils.isApplicableDay(Utils.addDays(now, -i), def.frequency)) continue;
                if (rand() < def.hitRate) {
                    completedDates.push(Utils.toISODate(Utils.addDays(now, -i)));
                }
            }
            const completedToday = todayCompletedFlags[index];
            if (completedToday) completedDates.push(Utils.toISODate(now));

            const currentProgress = completedToday
                ? def.goal
                : (def.goal > 1 ? Math.floor(def.goal * rand()) : 0);

            const habit = {
                id: Utils.uid('habit'),
                title: def.title,
                category: def.category,
                icon: def.icon,
                color: def.color,
                goal: def.goal,
                unit: def.unit,
                currentProgress,
                frequency: def.frequency,
                reminder: def.reminder,
                priority: def.priority,
                notes: def.notes,
                completedDates,
                streak: 0,
                longestStreak: 0,
                favorite: def.favorite,
                archived: false,
                createdAt: Utils.addDays(now, -55).toISOString(),
                updatedAt: now.toISOString(),
            };
            HabitLogic.recalculateStreak(habit);
            return habit;
        });
    }

    function buildSampleJournalEntries(habits) {
        const findId = (title) => (habits.find((h) => h.title === title) || {}).id || '';
        const now = new Date();
        return [
            {
                id: Utils.uid('journal'),
                date: Utils.toISODate(Utils.addDays(now, -1)),
                habitId: findId('Meditation'),
                habitName: 'Meditation',
                mood: 'good',
                notes: 'Felt really centered today after the morning session. Managed to stay focused for the full ten minutes without reaching for my phone. Small win, but it counts.',
                createdAt: Utils.addDays(now, -1).toISOString(),
                updatedAt: Utils.addDays(now, -1).toISOString(),
            },
            {
                id: Utils.uid('journal'),
                date: Utils.toISODate(Utils.addDays(now, -2)),
                habitId: findId('Morning Run'),
                habitName: 'Morning Run',
                mood: 'tired',
                notes: 'Struggled to get out of bed but pushed through a shorter route. Legs were sore from the previous day but glad I did not skip it entirely.',
                createdAt: Utils.addDays(now, -2).toISOString(),
                updatedAt: Utils.addDays(now, -2).toISOString(),
            },
            {
                id: Utils.uid('journal'),
                date: Utils.toISODate(Utils.addDays(now, -3)),
                habitId: findId('Read 30 Minutes'),
                habitName: 'Read 30 Minutes',
                mood: 'great',
                notes: 'Finished a whole chapter in one sitting for the first time in weeks. The story is finally picking up pace and I am hooked again.',
                createdAt: Utils.addDays(now, -3).toISOString(),
                updatedAt: Utils.addDays(now, -3).toISOString(),
            },
        ];
    }

    /* ========================================================================
       6. HABIT BUSINESS LOGIC (pure functions operating on a habit object)
       ======================================================================== */

    const HabitLogic = {
        isCompletedOn(habit, isoDate) {
            return habit.completedDates.includes(isoDate);
        },

        isCompletedToday(habit) {
            return HabitLogic.isCompletedOn(habit, Utils.toISODate(new Date()));
        },

        /** Recomputes both the current streak and the all-time longest streak */
        recalculateStreak(habit) {
            const sorted = [...new Set(habit.completedDates)].sort();

            // Longest streak: scan chronologically for the longest consecutive run
            let longest = 0;
            let run = 0;
            let prevDate = null;
            sorted.forEach((iso) => {
                const date = new Date(iso);
                if (prevDate) {
                    const gapDays = Math.round((date - prevDate) / 86400000);
                    const consecutive = habit.frequency === 'daily'
                        ? gapDays === 1
                        : gapDays <= 3; // weekday/weekend habits tolerate weekend/weekday gaps
                    run = consecutive ? run + 1 : 1;
                } else {
                    run = 1;
                }
                longest = Math.max(longest, run);
                prevDate = date;
            });
            habit.longestStreak = Math.max(habit.longestStreak || 0, longest);

            // Current streak: walk backward from today, allowing a one-day grace
            // period (today) if it has not been completed yet.
            const completedSet = new Set(sorted);
            let current = 0;
            let cursor = new Date();
            let sawIncompleteToday = false;
            for (let guard = 0; guard < 3650; guard += 1) {
                const iso = Utils.toISODate(cursor);
                const applicable = Utils.isApplicableDay(cursor, habit.frequency);
                if (applicable) {
                    if (completedSet.has(iso)) {
                        current += 1;
                    } else if (Utils.isSameDay(cursor, new Date()) && !sawIncompleteToday) {
                        sawIncompleteToday = true; // grace period for "today"
                    } else {
                        break;
                    }
                }
                cursor = Utils.addDays(cursor, -1);
            }
            habit.streak = current;
        },

        setProgress(habit, amount) {
            habit.currentProgress = Utils.clamp(amount, 0, habit.goal * 4);
            const today = Utils.toISODate(new Date());
            const nowCompleted = habit.currentProgress >= habit.goal;
            const wasCompleted = HabitLogic.isCompletedOn(habit, today);
            if (nowCompleted && !wasCompleted) {
                habit.completedDates.push(today);
            } else if (!nowCompleted && wasCompleted) {
                habit.completedDates = habit.completedDates.filter((d) => d !== today);
            }
            HabitLogic.recalculateStreak(habit);
            habit.updatedAt = new Date().toISOString();
            return nowCompleted && !wasCompleted; // true if this call just completed the habit
        },

        markComplete(habit) {
            return HabitLogic.setProgress(habit, habit.goal);
        },

        undoComplete(habit) {
            HabitLogic.setProgress(habit, 0);
        },

        increment(habit, step = 1) {
            return HabitLogic.setProgress(habit, habit.currentProgress + step);
        },

        decrement(habit, step = 1) {
            return HabitLogic.setProgress(habit, habit.currentProgress - step);
        },
    };

    /* ========================================================================
       7. HABIT STORE (CRUD + persistence + query helpers)
       ======================================================================== */

    const HabitStore = {
        habits: [],

        load() {
            const saved = Storage.get(STORAGE_KEYS.HABITS);
            if (Array.isArray(saved) && saved.length > 0) {
                this.habits = saved;
            } else {
                this.habits = buildSampleHabits();
                this.save();
            }
        },

        save() {
            Storage.set(STORAGE_KEYS.HABITS, this.habits);
        },

        getAll({ includeArchived = false } = {}) {
            return includeArchived ? this.habits : this.habits.filter((h) => !h.archived);
        },

        getById(id) {
            return this.habits.find((h) => h.id === id) || null;
        },

        create(payload) {
            const meta = CATEGORY_META[payload.category] || {};
            const habit = {
                id: Utils.uid('habit'),
                title: payload.title.trim(),
                category: payload.category,
                icon: payload.icon || meta.icon || 'fa-star',
                color: payload.color || '#4F46E5',
                goal: Number(payload.goal) > 0 ? Number(payload.goal) : 1,
                unit: meta.unit || 'time',
                currentProgress: 0,
                frequency: payload.frequency || 'daily',
                reminder: payload.reminder || null,
                priority: payload.priority || 'medium',
                notes: payload.notes ? payload.notes.trim() : '',
                completedDates: [],
                streak: 0,
                longestStreak: 0,
                favorite: false,
                archived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.habits.unshift(habit);
            this.save();
            return habit;
        },

        update(id, patch) {
            const habit = this.getById(id);
            if (!habit) return null;
            Object.assign(habit, patch, { updatedAt: new Date().toISOString() });
            if (patch.category && CATEGORY_META[patch.category]) {
                habit.unit = CATEGORY_META[patch.category].unit;
            }
            HabitLogic.recalculateStreak(habit);
            this.save();
            return habit;
        },

        delete(id) {
            this.habits = this.habits.filter((h) => h.id !== id);
            this.save();
        },

        archive(id) {
            return this.update(id, { archived: true });
        },

        restore(id) {
            return this.update(id, { archived: false });
        },

        duplicate(id) {
            const original = this.getById(id);
            if (!original) return null;
            const copy = {
                ...original,
                id: Utils.uid('habit'),
                title: `${original.title} (Copy)`,
                completedDates: [],
                currentProgress: 0,
                streak: 0,
                longestStreak: 0,
                favorite: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.habits.unshift(copy);
            this.save();
            return copy;
        },

        toggleFavorite(id) {
            const habit = this.getById(id);
            if (!habit) return null;
            habit.favorite = !habit.favorite;
            habit.updatedAt = new Date().toISOString();
            this.save();
            return habit;
        },

        isDuplicateTitle(title, excludeId = null) {
            const normalized = title.trim().toLowerCase();
            return this.habits.some((h) => !h.archived && h.id !== excludeId && h.title.trim().toLowerCase() === normalized);
        },

        search(list, query) {
            if (!query) return list;
            const q = query.trim().toLowerCase();
            return list.filter((h) => (
                h.title.toLowerCase().includes(q)
                || (CATEGORY_META[h.category]?.label || '').toLowerCase().includes(q)
                || (h.notes || '').toLowerCase().includes(q)
            ));
        },

        filter(list, criteria = {}) {
            let result = list;
            if (criteria.category) result = result.filter((h) => h.category === criteria.category);
            if (criteria.priority) result = result.filter((h) => h.priority === criteria.priority);
            if (criteria.frequency) result = result.filter((h) => h.frequency === criteria.frequency);
            if (criteria.favorite) result = result.filter((h) => h.favorite);
            if (criteria.status === 'completed') result = result.filter((h) => HabitLogic.isCompletedToday(h));
            if (criteria.status === 'incomplete') result = result.filter((h) => !HabitLogic.isCompletedToday(h));
            return result;
        },

        sort(list, key = 'newest') {
            const arr = [...list];
            const priorityRank = { high: 0, medium: 1, low: 2 };
            switch (key) {
                case 'oldest': return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                case 'name': return arr.sort((a, b) => a.title.localeCompare(b.title));
                case 'progress': return arr.sort((a, b) => (b.currentProgress / b.goal) - (a.currentProgress / a.goal));
                case 'priority': return arr.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
                case 'category': return arr.sort((a, b) => a.category.localeCompare(b.category));
                case 'streak': return arr.sort((a, b) => b.streak - a.streak);
                case 'newest':
                default: return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        },

        completionRateForDate(iso, { includeArchived = false } = {}) {
            const active = this.getAll({ includeArchived }).filter((h) => Utils.isApplicableDay(new Date(iso), h.frequency));
            if (active.length === 0) return 0;
            const completed = active.filter((h) => HabitLogic.isCompletedOn(h, iso)).length;
            return Math.round((completed / active.length) * 100);
        },

        completionRateForRange(startIso, endIso) {
            let cursor = new Date(startIso);
            const end = new Date(endIso);
            const rates = [];
            while (cursor <= end) {
                rates.push(this.completionRateForDate(Utils.toISODate(cursor)));
                cursor = Utils.addDays(cursor, 1);
            }
            if (rates.length === 0) return 0;
            return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
        },

        totalLifetimeCompletions() {
            return this.getAll({ includeArchived: true }).reduce((sum, h) => sum + h.completedDates.length, 0);
        },
    };

    /* ========================================================================
       8. GAMIFICATION — XP & LEVEL SYSTEM
       ======================================================================== */

    const GamificationService = {
        state: { xp: 0, totalXP: 0, level: 1, coins: 0, dailyXP: 0, dailyXPDate: '', earlyBirdCompletions: 0, nightOwlCompletions: 0 },

        load() {
            const saved = Storage.get(STORAGE_KEYS.GAMIFICATION);
            this.state = saved ? { ...this.state, ...saved } : { ...this.state };
            const today = Utils.toISODate(new Date());
            if (this.state.dailyXPDate !== today) {
                this.state.dailyXP = 0;
                this.state.dailyXPDate = today;
            }
            this.save();
        },

        save() {
            Storage.set(STORAGE_KEYS.GAMIFICATION, this.state);
        },

        requirementForLevel(level) {
            return 500 + (level - 1) * 150;
        },

        award(amount, reason = 'Bonus') {
            const today = Utils.toISODate(new Date());
            if (this.state.dailyXPDate !== today) {
                this.state.dailyXP = 0;
                this.state.dailyXPDate = today;
            }
            this.state.totalXP += amount;
            this.state.xp += amount;
            this.state.dailyXP += amount;
            this.state.coins += Math.round(amount / 4);

            let leveledUp = false;
            let requirement = this.requirementForLevel(this.state.level);
            while (this.state.xp >= requirement) {
                this.state.xp -= requirement;
                this.state.level += 1;
                leveledUp = true;
                requirement = this.requirementForLevel(this.state.level);
            }
            this.save();
            NotificationCenter.push(`+${amount} XP — ${reason}`, 'success');
            if (leveledUp) UI.triggerLevelUp(this.state.level);
            UI.updateGamificationUI();
        },

        progressPercent() {
            return Utils.clamp(Math.round((this.state.xp / this.requirementForLevel(this.state.level)) * 100), 0, 100);
        },
    };

    /* ========================================================================
       9. ACHIEVEMENTS
       ======================================================================== */

    const ACHIEVEMENT_DEFS = [
        { id: 'first-habit', title: 'First Habit', description: 'Created your very first habit.', icon: 'fa-flag-checkered', xp: 30,
            check: () => HabitStore.getAll({ includeArchived: true }).length >= 1 },
        { id: 'streak-7', title: '7 Day Streak', description: 'Kept a habit alive for 7 days straight.', icon: 'fa-fire', xp: XP_RULES.STREAK_7,
            check: () => HabitStore.getAll().some((h) => h.streak >= 7) },
        { id: 'streak-30', title: '30 Day Streak', description: 'A full month of unbroken consistency.', icon: 'fa-fire-flame-curved', xp: XP_RULES.STREAK_30,
            check: () => HabitStore.getAll().some((h) => h.streak >= 30) },
        { id: 'streak-100', title: '100 Day Streak', description: 'Reach a 100 day streak on any habit.', icon: 'fa-gem', xp: XP_RULES.STREAK_100,
            check: () => HabitStore.getAll().some((h) => h.streak >= 100) },
        { id: 'complete-all', title: 'Complete All Habits', description: 'Finish every active habit in a single day.', icon: 'fa-clipboard-check', xp: 80,
            check: () => {
                const active = HabitStore.getAll();
                return active.length > 0 && active.every((h) => HabitLogic.isCompletedToday(h));
            } },
        { id: 'habits-100', title: '100 Habits Completed', description: 'Complete habits 100 times in total.', icon: 'fa-award', xp: 150,
            check: () => HabitStore.totalLifetimeCompletions() >= 100 },
        { id: 'early-bird', title: 'Early Bird', description: 'Complete 10 habits before 7 AM.', icon: 'fa-sun', xp: 60,
            check: () => GamificationService.state.earlyBirdCompletions >= 10 },
        { id: 'night-owl', title: 'Night Owl', description: 'Complete 10 habits after 10 PM.', icon: 'fa-moon', xp: 60,
            check: () => GamificationService.state.nightOwlCompletions >= 10 },
        { id: 'book-lover', title: 'Book Lover', description: 'Reach a 14 day streak on a learning habit.', icon: 'fa-book-open-reader', xp: 90,
            check: () => HabitStore.getAll({ includeArchived: true }).some((h) => h.category === 'learning' && h.streak >= 14) },
        { id: 'fitness-hero', title: 'Fitness Hero', description: 'Complete 50 fitness habit sessions.', icon: 'fa-dumbbell', xp: 90,
            check: () => HabitStore.getAll({ includeArchived: true })
                .filter((h) => h.category === 'fitness')
                .reduce((sum, h) => sum + h.completedDates.length, 0) >= 50 },
        { id: 'meditation-master', title: 'Meditation Master', description: 'Log 50 mindfulness completions.', icon: 'fa-hands-praying', xp: 90,
            check: () => HabitStore.getAll({ includeArchived: true })
                .filter((h) => h.category === 'mindfulness')
                .reduce((sum, h) => sum + h.completedDates.length, 0) >= 50 },
    ];

    const AchievementService = {
        unlocked: {},

        load() {
            this.unlocked = Storage.get(STORAGE_KEYS.ACHIEVEMENTS, {});
        },

        save() {
            Storage.set(STORAGE_KEYS.ACHIEVEMENTS, this.unlocked);
        },

        isUnlocked(id) {
            return Boolean(this.unlocked[id]);
        },

        /** Evaluates every definition and unlocks + celebrates any new ones */
        evaluateAll() {
            const newlyUnlocked = [];
            ACHIEVEMENT_DEFS.forEach((def) => {
                if (this.isUnlocked(def.id)) return;
                let passed = false;
                try { passed = Boolean(def.check()); } catch (err) { passed = false; }
                if (passed) {
                    this.unlocked[def.id] = new Date().toISOString();
                    newlyUnlocked.push(def);
                }
            });
            if (newlyUnlocked.length > 0) {
                this.save();
                newlyUnlocked.forEach((def) => {
                    NotificationCenter.push(`Achievement unlocked: ${def.title}`, 'achievement');
                    GamificationService.award(def.xp, `${def.title} achievement`);
                });
                UI.renderAchievements();
            }
        },
    };

    /* ========================================================================
       10. JOURNAL STORE
       ======================================================================== */

    const JournalStore = {
        entries: [],

        load() {
            const saved = Storage.get(STORAGE_KEYS.JOURNAL);
            this.entries = Array.isArray(saved) ? saved : buildSampleJournalEntries(HabitStore.habits);
            this.save();
        },

        save() {
            Storage.set(STORAGE_KEYS.JOURNAL, this.entries);
        },

        getAll() {
            return [...this.entries].sort((a, b) => new Date(b.date) - new Date(a.date));
        },

        getById(id) {
            return this.entries.find((e) => e.id === id) || null;
        },

        create(payload) {
            const habit = payload.habitId ? HabitStore.getById(payload.habitId) : null;
            const entry = {
                id: Utils.uid('journal'),
                date: payload.date || Utils.toISODate(new Date()),
                habitId: payload.habitId || '',
                habitName: habit ? habit.title : '',
                mood: payload.mood || 'good',
                notes: (payload.notes || '').trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            this.entries.unshift(entry);
            this.save();
            return entry;
        },

        update(id, patch) {
            const entry = this.getById(id);
            if (!entry) return null;
            Object.assign(entry, patch, { updatedAt: new Date().toISOString() });
            this.save();
            return entry;
        },

        delete(id) {
            this.entries = this.entries.filter((e) => e.id !== id);
            this.save();
        },

        search(query) {
            if (!query) return this.getAll();
            const q = query.trim().toLowerCase();
            return this.getAll().filter((e) => (
                e.notes.toLowerCase().includes(q) || e.habitName.toLowerCase().includes(q)
            ));
        },
    };

    /* ========================================================================
       11. SETTINGS STORE
       ======================================================================== */

    const SettingsService = {
        defaults: { theme: 'light', notifications: true, reminderSound: 'chime', language: 'en' },
        settings: {},

        load() {
            const saved = Storage.get(STORAGE_KEYS.SETTINGS);
            this.settings = { ...this.defaults, ...(saved || {}) };
        },

        save() {
            Storage.set(STORAGE_KEYS.SETTINGS, this.settings);
        },

        update(patch) {
            this.settings = { ...this.settings, ...patch };
            this.save();
        },
    };

    /* ========================================================================
       12. THEME MANAGER
       ======================================================================== */

    const ThemeManager = {
        init() {
            const saved = Storage.get(STORAGE_KEYS.THEME);
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = saved || (prefersDark ? 'dark' : 'light');
            this.apply(theme, { silent: true });
        },

        apply(theme, { silent = false } = {}) {
            const isDark = theme === 'dark';
            document.body.classList.toggle('dark-mode', isDark);
            Storage.set(STORAGE_KEYS.THEME, theme);
            SettingsService.update({ theme });

            const toggleBtn = document.getElementById('themeToggleBtn');
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
                toggleBtn.setAttribute('aria-pressed', String(isDark));
            }
            const darkModeToggle = document.getElementById('darkModeToggle');
            if (darkModeToggle) darkModeToggle.checked = isDark;

            if (!silent) NotificationCenter.push(`${isDark ? 'Dark' : 'Light'} mode enabled`, 'info');
        },

        toggle() {
            const isDark = document.body.classList.contains('dark-mode');
            this.apply(isDark ? 'light' : 'dark');
        },
    };

    /* ========================================================================
       13. STATISTICS SERVICE
       ======================================================================== */

    const StatsService = {
        compute() {
            const active = HabitStore.getAll();
            const all = HabitStore.getAll({ includeArchived: true });
            const today = Utils.toISODate(new Date());

            const completedToday = active.filter((h) => HabitLogic.isCompletedOn(h, today));
            const completionPercentageToday = active.length ? Math.round((completedToday.length / active.length) * 100) : 0;

            const totalCompletions = all.reduce((sum, h) => sum + h.completedDates.length, 0);
            const totalPossible = all.reduce((sum, h) => {
                const daysSinceCreation = Math.max(1, Math.round((Date.now() - new Date(h.createdAt)) / 86400000));
                return sum + daysSinceCreation;
            }, 0);
            const successRate = totalPossible ? Math.round((totalCompletions / totalPossible) * 100) : 0;

            const mostCompleted = [...all].sort((a, b) => b.completedDates.length - a.completedDates.length)[0] || null;
            const leastCompleted = [...all].sort((a, b) => a.completedDates.length - b.completedDates.length)[0] || null;
            const longestStreakOverall = all.reduce((max, h) => Math.max(max, h.longestStreak), 0);

            // Best week within the last 8 weeks (Sunday-aligned)
            let bestWeekLabel = '—';
            let bestWeekCount = 0;
            for (let w = 0; w < 8; w += 1) {
                const weekEnd = Utils.addDays(new Date(), -w * 7);
                const weekStart = Utils.addDays(weekEnd, -6);
                let count = 0;
                all.forEach((h) => {
                    h.completedDates.forEach((iso) => {
                        const d = new Date(iso);
                        if (d >= weekStart && d <= weekEnd) count += 1;
                    });
                });
                if (count > bestWeekCount) {
                    bestWeekCount = count;
                    bestWeekLabel = `${Utils.formatShortDate(weekStart)} – ${Utils.formatShortDate(weekEnd)}`;
                }
            }

            const categoryStats = {};
            all.forEach((h) => {
                if (!categoryStats[h.category]) categoryStats[h.category] = { count: 0, completions: 0 };
                categoryStats[h.category].count += 1;
                categoryStats[h.category].completions += h.completedDates.length;
            });

            const stats = {
                completionPercentageToday,
                successRate,
                mostCompleted: mostCompleted ? mostCompleted.title : '—',
                leastCompleted: leastCompleted ? leastCompleted.title : '—',
                longestStreakOverall,
                bestWeekLabel,
                bestWeekCount,
                categoryStats,
                weekly: HabitStore.completionRateForRange(Utils.toISODate(Utils.addDays(new Date(), -6)), today),
                monthly: HabitStore.completionRateForRange(Utils.toISODate(Utils.addDays(new Date(), -29)), today),
                yearly: HabitStore.completionRateForRange(Utils.toISODate(Utils.addDays(new Date(), -364)), today),
            };
            Storage.set(STORAGE_KEYS.STATS, stats);
            return stats;
        },
    };

    /* ========================================================================
       14. CALENDAR SERVICE
       ======================================================================== */

    const CalendarService = {
        viewDate: new Date(),

        buildMonthGrid() {
            const year = this.viewDate.getFullYear();
            const month = this.viewDate.getMonth();
            const firstOfMonth = new Date(year, month, 1);
            const startOffset = firstOfMonth.getDay();
            const gridStart = Utils.addDays(firstOfMonth, -startOffset);
            const todayIso = Utils.toISODate(new Date());

            const cells = [];
            for (let i = 0; i < 42; i += 1) {
                const date = Utils.addDays(gridStart, i);
                const iso = Utils.toISODate(date);
                const isCurrentMonth = date.getMonth() === month;
                const completedCount = HabitStore.getAll({ includeArchived: true })
                    .filter((h) => HabitLogic.isCompletedOn(h, iso)).length;
                const isPast = date < new Date(new Date().toDateString());
                cells.push({
                    date, iso, isCurrentMonth,
                    isToday: iso === todayIso,
                    completedCount,
                    missed: isCurrentMonth && isPast && completedCount === 0 && iso !== todayIso,
                });
            }
            return cells;
        },

        goToPrevMonth() {
            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
        },

        goToNextMonth() {
            this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
        },

        monthLabel() {
            return this.viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        },
    };

    /* ========================================================================
       15. HEATMAP SERVICE (GitHub-style contribution intensity)
       ======================================================================== */

    const HeatmapService = {
        WEEKS: 26,

        buildData() {
            const today = new Date();
            const weeks = [];
            for (let w = this.WEEKS - 1; w >= 0; w -= 1) {
                const days = [];
                for (let d = 6; d >= 0; d -= 1) {
                    const date = Utils.addDays(today, -(w * 7 + d));
                    const iso = Utils.toISODate(date);
                    const count = HabitStore.getAll({ includeArchived: true })
                        .filter((h) => HabitLogic.isCompletedOn(h, iso)).length;
                    let level = 0;
                    if (count >= 1) level = 1;
                    if (count >= 3) level = 2;
                    if (count >= 5) level = 3;
                    if (count >= 7) level = 4;
                    days.push({ iso, count, level });
                }
                weeks.push(days);
            }
            return weeks;
        },
    };

    /* ========================================================================
       16. WATER / SLEEP / MOOD TRACKERS
       ======================================================================== */

    const WaterTracker = {
        state: { current: 0, goal: 8, date: '' },

        load() {
            const saved = Storage.get(STORAGE_KEYS.WATER, this.state);
            const today = Utils.toISODate(new Date());
            this.state = saved.date === today ? saved : { current: 0, goal: saved.goal || 8, date: today };
            this.save();
        },

        save() {
            Storage.set(STORAGE_KEYS.WATER, this.state);
        },

        add(amount = 1) {
            this.state.current = Utils.clamp(this.state.current + amount, 0, 20);
            this.save();
            UI.renderWaterTracker();
        },
    };

    const SleepTracker = {
        state: { hours: 7.5, goal: 8, date: '' },
        presets: [6, 6.5, 7, 7.5, 8, 8.5, 9],

        load() {
            const saved = Storage.get(STORAGE_KEYS.SLEEP, this.state);
            this.state = { ...this.state, ...saved };
        },

        save() { Storage.set(STORAGE_KEYS.SLEEP, this.state); },

        cyclePreset() {
            const idx = this.presets.indexOf(this.state.hours);
            const next = this.presets[(idx + 1) % this.presets.length];
            this.state.hours = next;
            this.save();
            UI.renderSleepTracker();
        },
    };

    const MoodTracker = {
        history: {},

        load() {
            this.history = Storage.get(STORAGE_KEYS.MOOD, {});
        },

        save() { Storage.set(STORAGE_KEYS.MOOD, this.history); },

        setToday(mood) {
            this.history[Utils.toISODate(new Date())] = mood;
            this.save();
        },

        getToday() {
            return this.history[Utils.toISODate(new Date())] || null;
        },
    };

    /* ========================================================================
       17. POMODORO TIMER
       ======================================================================== */

    const PomodoroTimer = {
        remaining: POMODORO_WORK_SECONDS,
        intervalId: null,
        running: false,

        init() {
            this.updateDisplay();
        },

        start() {
            if (this.running) return;
            this.running = true;
            this.intervalId = setInterval(() => {
                this.remaining -= 1;
                if (this.remaining <= 0) {
                    this.complete();
                    return;
                }
                this.updateDisplay();
            }, 1000);
        },

        pause() {
            this.running = false;
            clearInterval(this.intervalId);
        },

        reset() {
            this.pause();
            this.remaining = POMODORO_WORK_SECONDS;
            this.updateDisplay();
        },

        complete() {
            this.pause();
            this.remaining = POMODORO_WORK_SECONDS;
            this.updateDisplay();
            NotificationCenter.push('Pomodoro session complete — take a break!', 'success');
            SoundService.play('chime');
            NotificationService.notify('Pomodoro Complete', { body: 'Great focus! Time for a short break.' });
            GamificationService.award(15, 'Pomodoro session');
        },

        updateDisplay() {
            const el = document.getElementById('pomodoroTimeDisplay');
            if (!el) return;
            const minutes = String(Math.floor(this.remaining / 60)).padStart(2, '0');
            const seconds = String(this.remaining % 60).padStart(2, '0');
            el.textContent = `${minutes}:${seconds}`;
        },
    };

    /* ========================================================================
       18. SOUND SERVICE (WebAudio beeps — no external audio files needed)
       ======================================================================== */

    const SoundService = {
        play(kind = 'chime') {
            try {
                if (SettingsService.settings.reminderSound === 'none') return;
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (!Ctx) return;
                const ctx = new Ctx();
                const freqMap = { chime: 880, bell: 660, ding: 1046.5 };
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = freqMap[SettingsService.settings.reminderSound] || freqMap[kind] || 880;
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
                osc.connect(gain).connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.6);
            } catch (err) {
                console.warn(`${APP_NAME}: unable to play notification sound.`, err);
            }
        },
    };

    /* ========================================================================
       19. BROWSER NOTIFICATIONS + REMINDER SERVICE
       ======================================================================== */

    const NotificationService = {
        async requestPermission() {
            if (!('Notification' in window)) return 'unsupported';
            try {
                if (Notification.permission === 'default') {
                    return await Notification.requestPermission();
                }
                return Notification.permission;
            } catch (err) {
                console.warn(`${APP_NAME}: notification permission request failed.`, err);
                return 'denied';
            }
        },

        notify(title, options = {}) {
            if (!SettingsService.settings.notifications) return;
            try {
                if ('Notification' in window && Notification.permission === 'granted') {
                    // eslint-disable-next-line no-new
                    new Notification(title, { body: options.body || '', icon: options.icon });
                } else {
                    NotificationCenter.push(`${title}${options.body ? ` — ${options.body}` : ''}`, 'reminder');
                }
            } catch (err) {
                console.warn(`${APP_NAME}: failed to show browser notification.`, err);
            }
        },
    };

    const ReminderService = {
        notifiedToday: new Set(),

        getUpcoming(limit = 5) {
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            return HabitStore.getAll()
                .filter((h) => h.reminder && !HabitLogic.isCompletedToday(h))
                .map((h) => {
                    const [hh, mm] = h.reminder.split(':').map(Number);
                    return { habit: h, minutes: hh * 60 + mm };
                })
                .filter((entry) => entry.minutes >= nowMinutes)
                .sort((a, b) => a.minutes - b.minutes)
                .slice(0, limit);
        },

        startWatcher() {
            setInterval(() => this.check(), 30 * 1000);
            this.check();
        },

        check() {
            const now = new Date();
            const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const todayKey = Utils.toISODate(now);

            HabitStore.getAll().forEach((habit) => {
                if (!habit.reminder || HabitLogic.isCompletedToday(habit)) return;
                const notifyKey = `${habit.id}_${todayKey}_${habit.reminder}`;
                if (habit.reminder === currentHHMM && !this.notifiedToday.has(notifyKey)) {
                    this.notifiedToday.add(notifyKey);
                    NotificationService.notify(`Reminder: ${habit.title}`, { body: `It's time for ${habit.title}.` });
                    SoundService.play('bell');
                }
            });
            UI.renderReminders();
        },
    };

    /* ========================================================================
       20. NOTIFICATION CENTER (in-app toasts + activity log)
       ======================================================================== */

    const NotificationCenter = {
        log: [],
        unreadCount: 0,
        toastContainer: null,

        init() {
            this.log = Storage.get(STORAGE_KEYS.NOTIFICATIONS, []);
            this.toastContainer = document.createElement('div');
            this.toastContainer.setAttribute('aria-live', 'polite');
            this.toastContainer.style.cssText = 'position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:10px;z-index:9999;max-width:320px;';
            document.body.appendChild(this.toastContainer);
        },

        push(message, type = 'info') {
            const entry = { id: Utils.uid('note'), message, type, timestamp: new Date().toISOString(), read: false };
            this.log.unshift(entry);
            this.log = this.log.slice(0, 30);
            this.unreadCount += 1;
            Storage.set(STORAGE_KEYS.NOTIFICATIONS, this.log);
            this.renderToast(entry);
            UI.updateNotificationBadge();
        },

        renderToast(entry) {
            if (!this.toastContainer) return;
            const colors = { success: '#22C55E', error: '#EF4444', achievement: '#F59E0B', reminder: '#0EA5E9', info: '#4F46E5' };
            const toast = document.createElement('div');
            toast.className = 'animate-slide-left';
            toast.style.cssText = `background:${colors[entry.type] || colors.info};color:#fff;padding:14px 18px;border-radius:12px;font-family:'Poppins',sans-serif;font-size:0.85rem;font-weight:500;box-shadow:0 12px 28px rgba(15,23,42,0.2);`;
            toast.textContent = entry.message;
            this.toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.style.transition = 'opacity 300ms ease, transform 300ms ease';
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(20px)';
                setTimeout(() => toast.remove(), 320);
            }, 3600);
        },

        markAllRead() {
            this.unreadCount = 0;
            this.log.forEach((entry) => { entry.read = true; });
            Storage.set(STORAGE_KEYS.NOTIFICATIONS, this.log);
            UI.updateNotificationBadge();
        },
    };

    /* ========================================================================
       21. VALIDATION
       ======================================================================== */

    const Validator = {
        validateHabitForm({ title, goal }, { editingId = null } = {}) {
            const errors = {};
            if (!title || !title.trim()) {
                errors.title = 'Habit name is required.';
            } else if (HabitStore.isDuplicateTitle(title, editingId)) {
                errors.title = 'A habit with this name already exists.';
            }
            if (goal !== '' && goal !== null && goal !== undefined) {
                const numeric = Number(goal);
                if (Number.isNaN(numeric) || numeric <= 0) {
                    errors.goal = 'Goal must be a positive number.';
                }
            }
            return { valid: Object.keys(errors).length === 0, errors };
        },

        validateJournalForm({ notes }) {
            const errors = {};
            if (!notes || !notes.trim()) errors.notes = 'Journal notes cannot be empty.';
            return { valid: Object.keys(errors).length === 0, errors };
        },

        showFieldError(inputEl, message) {
            if (!inputEl) return;
            inputEl.setAttribute('aria-invalid', 'true');
            let errorEl = inputEl.parentElement.querySelector('.form-error-text');
            if (!errorEl) {
                errorEl = document.createElement('span');
                errorEl.className = 'form-error-text';
                errorEl.style.cssText = 'color:#EF4444;font-size:0.75rem;font-weight:500;';
                inputEl.insertAdjacentElement('afterend', errorEl);
            }
            errorEl.textContent = message;
        },

        clearFieldErrors(formEl) {
            if (!formEl) return;
            formEl.querySelectorAll('.form-error-text').forEach((el) => el.remove());
            formEl.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
        },
    };

    /* ========================================================================
       22. MODAL MANAGER (native <dialog> wrapper)
       ======================================================================== */

    const ModalManager = {
        pendingDeleteId: null,
        pendingAchievementId: null,

        open(id) {
            const dialog = document.getElementById(id);
            if (!dialog || typeof dialog.showModal !== 'function') return;
            if (!dialog.open) dialog.showModal();
        },

        close(id) {
            const dialog = document.getElementById(id);
            if (dialog && dialog.open) dialog.close();
        },

        closeAll() {
            document.querySelectorAll('dialog.modal[open]').forEach((dialog) => dialog.close());
        },

        /** Clicking the ::backdrop area (outside modal-content) closes the dialog */
        bindBackdropClose() {
            document.querySelectorAll('dialog.modal').forEach((dialog) => {
                dialog.addEventListener('click', (event) => {
                    const rect = dialog.getBoundingClientRect();
                    const inside = event.clientX >= rect.left && event.clientX <= rect.right
                        && event.clientY >= rect.top && event.clientY <= rect.bottom;
                    if (!inside) dialog.close();
                });
            });
        },
    };

    /* ========================================================================
       23. UI RENDER MODULE
       ======================================================================== */

    const UI = {
        cache: {},

        cacheSelectors() {
            const ids = [
                'currentDate', 'currentTime', 'motivationalQuote', 'currentStreakValue', 'longestStreakValue',
                'todayCompletionValue', 'dashboardCircularProgress', 'habitsCompletedNumber', 'totalHabitsNumber',
                'currentStreakNumber', 'xpEarnedNumber', 'habitCardsList', 'calendarGrid', 'calendarCurrentMonth',
                'heatmapGrid', 'achievementsGrid', 'journalCardsList', 'notificationBadge', 'levelText',
                'waterIntakeValue', 'sleepHoursValue', 'pomodoroTimeDisplay', 'globalSearch', 'habitSearchInput',
            ];
            ids.forEach((id) => { this.cache[id] = document.getElementById(id); });
            this.cache.levelText = document.querySelector('.level-text');
            this.cache.xpFill = document.querySelector('.xp-progress-fill');
            this.cache.xpLabel = document.querySelector('.xp-progress-label');
            this.cache.greetingText = document.querySelector('.greeting-text');
        },

        renderAll() {
            this.renderGreeting();
            this.renderDashboard();
            this.renderHabitList();
            this.renderProgressSection();
            this.renderHeatmap();
            this.renderCalendar();
            this.renderAchievements();
            this.renderJournal();
            this.renderAnalytics();
            this.renderReminders();
            this.renderQuote();
            this.renderWaterTracker();
            this.renderSleepTracker();
            this.renderMoodTracker();
            this.updateGamificationUI();
            this.updateNotificationBadge();
        },

        /* ---- Greeting / Clock ---- */
        renderGreeting() {
            const now = new Date();
            if (this.cache.greetingText) {
                const wave = this.cache.greetingText.querySelector('.wave-emoji');
                this.cache.greetingText.firstChild.textContent = `${Utils.getGreeting()} `;
                if (!wave) this.cache.greetingText.insertAdjacentHTML('beforeend', '<span class="wave-emoji" aria-hidden="true">👋</span>');
            }
            if (this.cache.currentDate) this.cache.currentDate.textContent = Utils.formatFriendlyDate(now);
            this.renderClock();
        },

        renderClock() {
            if (!this.cache.currentTime) return;
            const now = new Date();
            this.cache.currentTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        },

        renderQuote() {
            const quote = QuoteService.getQuoteOfTheDay();
            if (this.cache.motivationalQuote) this.cache.motivationalQuote.textContent = `"${quote.text}"`;
            const sidebarQuote = document.querySelector('.insight-card-quote');
            const sidebarAuthor = document.querySelector('.insight-quote-author');
            if (sidebarQuote) sidebarQuote.textContent = `"${quote.text}"`;
            if (sidebarAuthor) sidebarAuthor.textContent = `— ${quote.author}`;
        },

        /* ---- Dashboard: welcome card + quick stats + circular progress ---- */
        renderDashboard() {
            const active = HabitStore.getAll();
            const today = Utils.toISODate(new Date());
            const completedToday = active.filter((h) => HabitLogic.isCompletedOn(h, today));
            const percent = active.length ? Math.round((completedToday.length / active.length) * 100) : 0;
            const bestStreak = active.reduce((max, h) => Math.max(max, h.streak), 0);
            const longest = active.reduce((max, h) => Math.max(max, h.longestStreak), 0);

            if (this.cache.currentStreakValue) this.cache.currentStreakValue.textContent = String(bestStreak);
            if (this.cache.longestStreakValue) this.cache.longestStreakValue.textContent = String(longest);
            if (this.cache.todayCompletionValue) this.cache.todayCompletionValue.textContent = `${percent}%`;
            this.animateCircularProgress(this.cache.dashboardCircularProgress, percent);

            if (this.cache.habitsCompletedNumber) this.cache.habitsCompletedNumber.textContent = String(completedToday.length);
            if (this.cache.totalHabitsNumber) this.cache.totalHabitsNumber.textContent = String(active.length);
            if (this.cache.currentStreakNumber) this.cache.currentStreakNumber.textContent = String(bestStreak);
            if (this.cache.xpEarnedNumber) this.cache.xpEarnedNumber.textContent = String(GamificationService.state.dailyXP);
        },

        animateCircularProgress(el, percent) {
            if (!el) return;
            el.style.background = `conic-gradient(#FFFFFF 0% ${percent}%, rgba(255,255,255,0.25) ${percent}% 100%)`;
            const valueEl = el.querySelector('.circular-progress-value');
            if (valueEl) valueEl.textContent = `${percent}%`;
            el.setAttribute('aria-label', `${percent} percent of today's habits completed`);
        },

        /* ---- Today's Habits list ---- */
        getVisibleHabits() {
            let list = HabitStore.getAll();
            list = HabitStore.search(list, AppUIState.searchQuery);
            list = HabitStore.filter(list, AppUIState.filters);
            list = HabitStore.sort(list, AppUIState.sortKey);
            return list;
        },

        renderHabitList() {
            const container = this.cache.habitCardsList;
            if (!container) return;
            const habits = this.getVisibleHabits();
            container.innerHTML = '';

            if (habits.length === 0) {
                const empty = document.createElement('li');
                empty.className = 'habit-card animate-fade-in';
                empty.style.cssText = 'justify-content:center;text-align:center;color:var(--color-text-secondary);';
                empty.textContent = 'No habits match your search or filters yet.';
                container.appendChild(empty);
                return;
            }

            habits.forEach((habit) => container.appendChild(this.buildHabitCard(habit)));
        },

        buildHabitCard(habit) {
            const meta = CATEGORY_META[habit.category] || {};
            const li = document.createElement('li');
            li.className = 'habit-card animate-fade-in';
            li.dataset.habitId = habit.id;
            const completed = HabitLogic.isCompletedToday(habit);
            const progressPercent = Utils.clamp(Math.round((habit.currentProgress / habit.goal) * 100), 0, 100);
            const showStepper = habit.goal > 1;

            li.innerHTML = `
                <div class="habit-card-main">
                    <label class="habit-checkbox-wrapper">
                        <input type="checkbox" class="habit-checkbox" ${completed ? 'checked' : ''} aria-label="Mark ${Utils.escapeHTML(habit.title)} as complete">
                        <span class="habit-checkbox-custom"></span>
                    </label>
                    <div class="habit-icon-box ${meta.iconBox || ''}" aria-hidden="true" style="${meta.iconBox ? '' : `background-color:${habit.color}22;color:${habit.color};`}">
                        <i class="fa-solid ${habit.icon}"></i>
                    </div>
                    <div class="habit-details">
                        <h3 class="habit-name">${Utils.escapeHTML(habit.title)}</h3>
                        <div class="habit-meta">
                            <span class="habit-category-tag">${Utils.escapeHTML(meta.label || habit.category)}</span>
                            <span class="habit-meta-item"><i class="fa-solid fa-repeat"></i> ${FREQUENCY_LABELS[habit.frequency] || 'Daily'}</span>
                            <span class="habit-meta-item"><i class="fa-regular fa-clock"></i> ${habit.reminder ? Utils.formatTime12h(habit.reminder) : 'No reminder'}</span>
                            ${habit.priority === 'high' ? '<span class="habit-meta-item"><i class="fa-solid fa-flag"></i> High Priority</span>' : ''}
                        </div>
                        <div class="habit-progress-row">
                            <div class="progress-bar-placeholder" role="progressbar" aria-label="${Utils.escapeHTML(habit.title)} progress" aria-valuenow="${habit.currentProgress}" aria-valuemin="0" aria-valuemax="${habit.goal}">
                                <div class="progress-bar-fill" style="width:${progressPercent}%;"></div>
                            </div>
                            <span class="habit-progress-text"><span class="current-progress">${habit.currentProgress}</span> / <span class="target-goal">${habit.goal} ${Utils.escapeHTML(habit.unit)}</span></span>
                            ${showStepper ? `
                            <div class="habit-stepper">
                                <button type="button" class="habit-action-btn habit-decrement-btn" aria-label="Decrease progress for ${Utils.escapeHTML(habit.title)}"><i class="fa-solid fa-minus"></i></button>
                                <button type="button" class="habit-action-btn habit-increment-btn" aria-label="Increase progress for ${Utils.escapeHTML(habit.title)}"><i class="fa-solid fa-plus"></i></button>
                            </div>` : ''}
                        </div>
                        <div class="habit-streak-row">
                            <span class="habit-streak-badge"><i class="fa-solid fa-fire"></i> Streak: <span class="current-streak">${habit.streak}</span></span>
                            <span class="habit-streak-badge"><i class="fa-solid fa-medal"></i> Best: <span class="longest-streak">${habit.longestStreak}</span></span>
                        </div>
                    </div>
                </div>
                <div class="habit-card-actions">
                    <button type="button" class="habit-action-btn habit-edit-btn" aria-label="Edit ${Utils.escapeHTML(habit.title)} habit"><i class="fa-solid fa-pen"></i></button>
                    <button type="button" class="habit-action-btn habit-duplicate-btn" aria-label="Duplicate ${Utils.escapeHTML(habit.title)} habit"><i class="fa-regular fa-copy"></i></button>
                    <button type="button" class="habit-action-btn habit-delete-btn" aria-label="Delete ${Utils.escapeHTML(habit.title)} habit"><i class="fa-solid fa-trash"></i></button>
                    <button type="button" class="habit-action-btn habit-archive-btn" aria-label="Archive ${Utils.escapeHTML(habit.title)} habit"><i class="fa-solid fa-box-archive"></i></button>
                    <button type="button" class="habit-action-btn favorite-btn" aria-label="Mark ${Utils.escapeHTML(habit.title)} as favorite" aria-pressed="${habit.favorite}"><i class="fa-${habit.favorite ? 'solid' : 'regular'} fa-star"></i></button>
                    <button type="button" class="habit-action-btn habit-notes-btn" aria-label="View notes for ${Utils.escapeHTML(habit.title)}"><i class="fa-regular fa-note-sticky"></i></button>
                </div>
            `;
            return li;
        },

        /** Lightweight patch of a single card without rebuilding the whole list */
        patchHabitCard(habit) {
            const container = this.cache.habitCardsList;
            if (!container) return;
            const existing = container.querySelector(`[data-habit-id="${habit.id}"]`);
            if (!existing) { this.renderHabitList(); return; }
            const replacement = this.buildHabitCard(habit);
            existing.replaceWith(replacement);
        },

        /* ---- Progress Section (daily/weekly/monthly/yearly cards) ---- */
        renderProgressSection() {
            const stats = StatsService.compute();
            const map = {
                dailyProgressCard: stats.completionPercentageToday,
                weeklyProgressCard: stats.weekly,
                monthlyProgressCard: stats.monthly,
                yearlyProgressCard: stats.yearly,
            };
            Object.entries(map).forEach(([cardId, percent]) => {
                const card = document.getElementById(cardId);
                if (!card) return;
                const percentEl = card.querySelector('.progress-card-percentage');
                if (percentEl) percentEl.textContent = `${percent}%`;
            });
        },

        /* ---- Heatmap ---- */
        renderHeatmap() {
            const grid = this.cache.heatmapGrid;
            if (!grid) return;
            grid.innerHTML = '';
            const weeks = HeatmapService.buildData();
            weeks.forEach((week) => {
                const col = document.createElement('div');
                col.className = 'heatmap-column';
                week.forEach((day) => {
                    const cell = document.createElement('div');
                    cell.className = `heatmap-day level-${day.level}`;
                    cell.style.cssText = 'flex:1;border-radius:2px;';
                    cell.setAttribute('data-tooltip', `${Utils.formatShortDate(day.iso)}: ${day.count} habit${day.count === 1 ? '' : 's'} completed`);
                    col.appendChild(cell);
                });
                grid.appendChild(col);
            });
        },

        /* ---- Calendar ---- */
        renderCalendar() {
            const grid = this.cache.calendarGrid;
            if (!grid) return;
            grid.innerHTML = '';
            if (this.cache.calendarCurrentMonth) this.cache.calendarCurrentMonth.textContent = CalendarService.monthLabel();

            CalendarService.buildMonthGrid().forEach((cell) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'calendar-day';
                if (!cell.isCurrentMonth) btn.classList.add('outside-month');
                if (cell.isToday) btn.classList.add('today');
                if (cell.completedCount > 0) btn.classList.add('completed');
                if (cell.missed) btn.classList.add('missed');
                btn.textContent = String(cell.date.getDate());
                btn.setAttribute('data-tooltip', `${Utils.formatShortDate(cell.iso)}: ${cell.completedCount} completed`);
                btn.setAttribute('aria-label', `${Utils.formatShortDate(cell.iso)}, ${cell.completedCount} habits completed`);
                grid.appendChild(btn);
            });
        },

        /* ---- Achievements ---- */
        renderAchievements() {
            const grid = this.cache.achievementsGrid;
            if (!grid) return;
            grid.innerHTML = '';
            ACHIEVEMENT_DEFS.forEach((def) => {
                const unlocked = AchievementService.isUnlocked(def.id);
                const li = document.createElement('li');
                li.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'} animate-scale-in`;
                li.dataset.achievementId = def.id;
                li.innerHTML = `
                    <div class="achievement-icon-box"><i class="fa-solid ${def.icon}"></i></div>
                    <h3 class="achievement-title">${Utils.escapeHTML(def.title)}</h3>
                    <p class="achievement-description">${Utils.escapeHTML(def.description)}</p>
                    <span class="achievement-status-placeholder ${unlocked ? 'unlocked-status' : 'locked-status'}">
                        <i class="fa-solid ${unlocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                `;
                grid.appendChild(li);
            });
        },

        /* ---- Journal ---- */
        renderJournal() {
            const list = this.cache.journalCardsList;
            if (!list) return;
            list.innerHTML = '';
            const entries = AppUIState.journalQuery ? JournalStore.search(AppUIState.journalQuery) : JournalStore.getAll();

            if (entries.length === 0) {
                const empty = document.createElement('li');
                empty.className = 'journal-card';
                empty.textContent = 'No journal entries yet — add your first one!';
                list.appendChild(empty);
                return;
            }

            entries.forEach((entry) => {
                const moodMeta = MOOD_META[entry.mood] || MOOD_META.good;
                const li = document.createElement('li');
                li.className = 'journal-card animate-fade-in';
                li.dataset.journalId = entry.id;
                li.innerHTML = `
                    <div class="journal-card-header">
                        <span class="journal-date"><i class="fa-regular fa-calendar"></i> ${Utils.formatShortDate(entry.date)}</span>
                        <span class="journal-mood-icon" aria-label="Mood: ${moodMeta.label}"><i class="fa-regular ${moodMeta.icon}"></i></span>
                    </div>
                    ${entry.habitName ? `<p class="journal-habit-name">Linked Habit: ${Utils.escapeHTML(entry.habitName)}</p>` : ''}
                    <p class="journal-notes-preview">${Utils.escapeHTML(entry.notes)}</p>
                    <div class="section-header-actions">
                        <button type="button" class="btn btn-text read-more-btn" aria-label="Read full journal entry for ${Utils.formatShortDate(entry.date)}">Read More</button>
                        <button type="button" class="btn btn-text journal-delete-btn" aria-label="Delete journal entry">Delete</button>
                    </div>
                `;
                list.appendChild(li);
            });
        },

        /* ---- Analytics ---- */
        renderAnalytics() {
            const stats = StatsService.compute();
            const summaries = {
                completionRateCard: `${stats.completionPercentageToday}% completed today`,
                habitSuccessRateCard: `${stats.successRate}% lifetime success rate`,
                weeklyTrendCard: `${stats.weekly}% average this week`,
                monthlyTrendCard: `${stats.monthly}% average this month`,
                categoryBreakdownCard: Object.entries(stats.categoryStats)
                    .map(([cat, data]) => `${(CATEGORY_META[cat] || {}).label || cat}: ${data.completions}`)
                    .join(' · ') || 'No data yet',
            };
            Object.entries(summaries).forEach(([cardId, text]) => {
                const card = document.getElementById(cardId);
                if (!card) return;
                let summaryEl = card.querySelector('.analytics-summary-text');
                if (!summaryEl) {
                    summaryEl = document.createElement('p');
                    summaryEl.className = 'progress-card-label analytics-summary-text';
                    card.appendChild(summaryEl);
                }
                summaryEl.textContent = text;
            });

            const extraStats = document.getElementById('completionRateCard');
            if (extraStats) {
                let detail = extraStats.querySelector('.analytics-detail-text');
                if (!detail) {
                    detail = document.createElement('p');
                    detail.className = 'progress-card-label analytics-detail-text';
                    extraStats.appendChild(detail);
                }
                detail.textContent = `Most completed: ${stats.mostCompleted} · Longest streak: ${stats.longestStreakOverall} days · Best week: ${stats.bestWeekLabel}`;
            }
        },

        /* ---- Right sidebar widgets ---- */
        renderReminders() {
            const list = document.querySelector('.reminders-list');
            if (!list) return;
            const upcoming = ReminderService.getUpcoming();
            list.innerHTML = upcoming.length
                ? upcoming.map((entry) => `
                    <li class="reminder-item">
                        <span class="reminder-time">${Utils.formatTime12h(entry.habit.reminder)}</span>
                        <span class="reminder-habit">${Utils.escapeHTML(entry.habit.title)}</span>
                    </li>`).join('')
                : '<li class="reminder-item"><span class="reminder-habit">No upcoming reminders today</span></li>';
        },

        renderWaterTracker() {
            const valueEl = this.cache.waterIntakeValue;
            if (valueEl) valueEl.textContent = String(WaterTracker.state.current);
            const fill = document.querySelector('.water-fill');
            if (fill) fill.style.width = `${Utils.clamp(Math.round((WaterTracker.state.current / WaterTracker.state.goal) * 100), 0, 100)}%`;
            const track = fill ? fill.closest('.insight-progress-track') : null;
            if (track) track.setAttribute('aria-valuenow', String(Math.round((WaterTracker.state.current / WaterTracker.state.goal) * 100)));
        },

        renderSleepTracker() {
            const valueEl = this.cache.sleepHoursValue;
            if (valueEl) valueEl.textContent = String(SleepTracker.state.hours);
            const fill = document.querySelector('.sleep-fill');
            if (fill) fill.style.width = `${Utils.clamp(Math.round((SleepTracker.state.hours / SleepTracker.state.goal) * 100), 0, 100)}%`;
        },

        renderMoodTracker() {
            const todayMood = MoodTracker.getToday();
            document.querySelectorAll('#moodTrackerCard .mood-option-btn').forEach((btn) => {
                const label = btn.getAttribute('aria-label') || '';
                const isSelected = todayMood && label.toLowerCase().includes(todayMood);
                btn.setAttribute('aria-pressed', String(Boolean(isSelected)));
            });
        },

        /* ---- Gamification UI ---- */
        updateGamificationUI() {
            const { level, xp } = GamificationService.state;
            const requirement = GamificationService.requirementForLevel(level);
            const percent = GamificationService.progressPercent();
            if (this.cache.levelText) this.cache.levelText.textContent = `Level ${level}`;
            if (this.cache.xpFill) this.cache.xpFill.style.width = `${percent}%`;
            if (this.cache.xpLabel) this.cache.xpLabel.textContent = `${xp} / ${requirement} XP`;
            const track = document.querySelector('.xp-progress-track');
            if (track) track.setAttribute('aria-valuenow', String(percent));
        },

        triggerLevelUp(newLevel) {
            NotificationCenter.push(`Level Up! You reached Level ${newLevel}`, 'achievement');
            const card = document.getElementById('userProfileCard');
            if (card) {
                card.classList.add('animate-scale-in');
                setTimeout(() => card.classList.remove('animate-scale-in'), 500);
            }
        },

        updateNotificationBadge() {
            const badge = this.cache.notificationBadge;
            if (!badge) return;
            const count = NotificationCenter.unreadCount;
            badge.textContent = count > 9 ? '9+' : String(count);
            badge.style.display = count > 0 ? 'grid' : 'none';
        },
    };

    /* Mutable UI state shared by search / filter / sort controls */
    const AppUIState = {
        searchQuery: '',
        journalQuery: '',
        filters: {},
        sortKey: 'newest',
        selectedHabitId: null,
    };

    /* ========================================================================
       24. FORM HELPERS (icon picker, category select population, etc.)
       ======================================================================== */

    const FormHelpers = {
        buildIconPicker(container, selectedIcon) {
            if (!container) return;
            container.innerHTML = '';
            ICON_OPTIONS.forEach((opt) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'icon-picker-option';
                btn.setAttribute('role', 'radio');
                btn.setAttribute('aria-label', opt.label);
                const isSelected = opt.icon === selectedIcon;
                btn.setAttribute('aria-checked', String(isSelected));
                btn.dataset.icon = opt.icon;
                btn.innerHTML = `<i class="fa-solid ${opt.icon}"></i>`;
                container.appendChild(btn);
            });
        },

        getSelectedIcon(container) {
            const active = container?.querySelector('[aria-checked="true"]');
            return active ? active.dataset.icon : ICON_OPTIONS[0].icon;
        },

        selectIcon(container, iconEl) {
            container.querySelectorAll('.icon-picker-option').forEach((btn) => btn.setAttribute('aria-checked', 'false'));
            iconEl.setAttribute('aria-checked', 'true');
        },

        populateJournalHabitSelect() {
            const select = document.getElementById('journalEntryHabit');
            if (!select) return;
            const current = select.value;
            select.innerHTML = '<option value="">None</option>';
            HabitStore.getAll().forEach((habit) => {
                const opt = document.createElement('option');
                opt.value = habit.id;
                opt.textContent = habit.title;
                select.appendChild(opt);
            });
            if ([...select.options].some((o) => o.value === current)) select.value = current;
        },

        fillEditHabitForm(habit) {
            document.getElementById('editHabitName').value = habit.title;
            document.getElementById('editHabitCategory').value = habit.category;
            document.getElementById('editHabitColor').value = habit.color;
            document.getElementById('editHabitFrequency').value = habit.frequency;
            document.getElementById('editHabitReminderTime').value = habit.reminder || '';
            document.getElementById('editHabitGoal').value = habit.goal;
            document.getElementById('editHabitNotes').value = habit.notes || '';
            this.buildIconPicker(document.getElementById('editHabitIconPicker'), habit.icon);
        },

        resetAddHabitForm(formEl) {
            formEl.reset();
            this.buildIconPicker(document.getElementById('addHabitIconPicker'), ICON_OPTIONS[0].icon);
            Validator.clearFieldErrors(formEl);
        },
    };

    /* ========================================================================
       25. NOTES VIEWER + FILTER/SORT DIALOGS (built dynamically, reuse .modal CSS)
       ======================================================================== */

    const DynamicDialogs = {
        notesDialog: null,
        filterDialog: null,
        sortDialog: null,

        ensureNotesDialog() {
            if (this.notesDialog) return this.notesDialog;
            const dialog = document.createElement('dialog');
            dialog.className = 'modal modal-small';
            dialog.id = 'habitNotesModal';
            dialog.innerHTML = `
                <div class="modal-content">
                    <header class="modal-header">
                        <h2 class="modal-title">Habit Notes</h2>
                        <button type="button" class="modal-close-btn" aria-label="Close notes dialog"><i class="fa-solid fa-xmark"></i></button>
                    </header>
                    <div class="modal-body"><p class="notes-dialog-body"></p></div>
                    <footer class="modal-footer">
                        <button type="button" class="btn btn-primary notes-dialog-close-action" aria-label="Close">Got It</button>
                    </footer>
                </div>`;
            document.body.appendChild(dialog);
            dialog.querySelectorAll('.modal-close-btn, .notes-dialog-close-action').forEach((btn) => {
                btn.addEventListener('click', () => dialog.close());
            });
            dialog.addEventListener('click', (event) => {
                const rect = dialog.getBoundingClientRect();
                const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
                if (!inside) dialog.close();
            });
            this.notesDialog = dialog;
            return dialog;
        },

        showNotes(habit) {
            const dialog = this.ensureNotesDialog();
            dialog.querySelector('.modal-title').textContent = `Notes — ${habit.title}`;
            dialog.querySelector('.notes-dialog-body').textContent = habit.notes || 'No notes added for this habit yet.';
            dialog.showModal();
        },

        ensureFilterDialog() {
            if (this.filterDialog) return this.filterDialog;
            const categoryOptions = Object.entries(CATEGORY_META)
                .map(([value, meta]) => `<option value="${value}">${meta.label}</option>`).join('');
            const dialog = document.createElement('dialog');
            dialog.className = 'modal modal-small';
            dialog.id = 'habitFilterModal';
            dialog.innerHTML = `
                <div class="modal-content">
                    <header class="modal-header">
                        <h2 class="modal-title">Filter Habits</h2>
                        <button type="button" class="modal-close-btn" aria-label="Close filter dialog"><i class="fa-solid fa-xmark"></i></button>
                    </header>
                    <form class="modal-form" id="habitFilterForm">
                        <div class="form-group">
                            <label for="filterCategory">Category</label>
                            <select id="filterCategory"><option value="">All Categories</option>${categoryOptions}</select>
                        </div>
                        <div class="form-group">
                            <label for="filterPriority">Priority</label>
                            <select id="filterPriority"><option value="">All Priorities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filterFrequency">Frequency</label>
                            <select id="filterFrequency"><option value="">All Frequencies</option><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option><option value="weekly">Weekly</option></select>
                        </div>
                        <div class="form-group">
                            <label for="filterStatus">Status</label>
                            <select id="filterStatus"><option value="">All</option><option value="completed">Completed Today</option><option value="incomplete">Incomplete Today</option></select>
                        </div>
                        <div class="form-group form-group-toggle">
                            <label for="filterFavorite">Favorites Only</label>
                            <label class="toggle-switch"><input type="checkbox" id="filterFavorite"><span class="toggle-slider" aria-hidden="true"></span></label>
                        </div>
                        <footer class="modal-footer">
                            <button type="button" class="btn btn-outline" id="filterClearBtn">Clear</button>
                            <button type="submit" class="btn btn-primary">Apply Filters</button>
                        </footer>
                    </form>
                </div>`;
            document.body.appendChild(dialog);
            dialog.querySelector('.modal-close-btn').addEventListener('click', () => dialog.close());
            dialog.querySelector('#filterClearBtn').addEventListener('click', () => {
                AppUIState.filters = {};
                dialog.querySelector('#habitFilterForm').reset();
                UI.renderHabitList();
                dialog.close();
            });
            dialog.querySelector('#habitFilterForm').addEventListener('submit', (event) => {
                event.preventDefault();
                AppUIState.filters = {
                    category: dialog.querySelector('#filterCategory').value,
                    priority: dialog.querySelector('#filterPriority').value,
                    frequency: dialog.querySelector('#filterFrequency').value,
                    status: dialog.querySelector('#filterStatus').value,
                    favorite: dialog.querySelector('#filterFavorite').checked,
                };
                UI.renderHabitList();
                dialog.close();
            });
            dialog.addEventListener('click', (event) => {
                const rect = dialog.getBoundingClientRect();
                const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
                if (!inside) dialog.close();
            });
            this.filterDialog = dialog;
            return dialog;
        },

        ensureSortDialog() {
            if (this.sortDialog) return this.sortDialog;
            const options = [
                ['newest', 'Newest First'], ['oldest', 'Oldest First'], ['name', 'Name (A–Z)'],
                ['progress', 'Progress'], ['priority', 'Priority'], ['category', 'Category'], ['streak', 'Streak'],
            ];
            const dialog = document.createElement('dialog');
            dialog.className = 'modal modal-small';
            dialog.id = 'habitSortModal';
            dialog.innerHTML = `
                <div class="modal-content">
                    <header class="modal-header">
                        <h2 class="modal-title">Sort Habits</h2>
                        <button type="button" class="modal-close-btn" aria-label="Close sort dialog"><i class="fa-solid fa-xmark"></i></button>
                    </header>
                    <div class="modal-body">
                        <div class="priority-options" role="radiogroup" aria-label="Sort order" style="flex-direction:column;gap:8px;">
                            ${options.map(([value, label]) => `
                                <label class="priority-option" style="justify-content:flex-start;">
                                    <input type="radio" name="sortKey" value="${value}" ${AppUIState.sortKey === value ? 'checked' : ''}>
                                    <span>${label}</span>
                                </label>`).join('')}
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(dialog);
            dialog.querySelector('.modal-close-btn').addEventListener('click', () => dialog.close());
            dialog.addEventListener('change', (event) => {
                if (event.target.name === 'sortKey') {
                    AppUIState.sortKey = event.target.value;
                    UI.renderHabitList();
                }
            });
            dialog.addEventListener('click', (event) => {
                const rect = dialog.getBoundingClientRect();
                const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
                if (!inside) dialog.close();
            });
            this.sortDialog = dialog;
            return dialog;
        },
    };

    /* ========================================================================
       26. EXPORT / IMPORT
       ======================================================================== */

    const DataPortability = {
        collectBackup() {
            return {
                app: APP_NAME,
                version: APP_VERSION,
                exportedAt: new Date().toISOString(),
                habits: HabitStore.habits,
                journal: JournalStore.entries,
                achievements: AchievementService.unlocked,
                settings: SettingsService.settings,
                gamification: GamificationService.state,
                water: WaterTracker.state,
                sleep: SleepTracker.state,
                mood: MoodTracker.history,
            };
        },

        downloadFile(filename, content, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        },

        exportJSON() {
            const backup = this.collectBackup();
            this.downloadFile(`habitsystems-backup-${Utils.toISODate(new Date())}.json`, JSON.stringify(backup, null, 2), 'application/json');
            NotificationCenter.push('Backup exported as JSON', 'success');
        },

        exportCSV() {
            const headers = ['Title', 'Category', 'Frequency', 'Priority', 'Goal', 'Unit', 'Current Progress', 'Streak', 'Longest Streak', 'Favorite', 'Archived', 'Created At'];
            const rows = HabitStore.getAll({ includeArchived: true }).map((h) => [
                h.title, h.category, h.frequency, h.priority, h.goal, h.unit, h.currentProgress, h.streak, h.longestStreak, h.favorite, h.archived, h.createdAt,
            ]);
            const csv = [headers, ...rows]
                .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');
            this.downloadFile(`habitsystems-habits-${Utils.toISODate(new Date())}.csv`, csv, 'text/csv');
            NotificationCenter.push('Habits exported as CSV', 'success');
        },

        importJSON(file) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!data || !Array.isArray(data.habits)) throw new Error('Invalid backup file structure.');
                    HabitStore.habits = data.habits;
                    HabitStore.save();
                    JournalStore.entries = Array.isArray(data.journal) ? data.journal : [];
                    JournalStore.save();
                    AchievementService.unlocked = data.achievements || {};
                    AchievementService.save();
                    SettingsService.settings = { ...SettingsService.defaults, ...(data.settings || {}) };
                    SettingsService.save();
                    GamificationService.state = { ...GamificationService.state, ...(data.gamification || {}) };
                    GamificationService.save();
                    if (data.water) { WaterTracker.state = data.water; WaterTracker.save(); }
                    if (data.sleep) { SleepTracker.state = data.sleep; SleepTracker.save(); }
                    if (data.mood) { MoodTracker.history = data.mood; MoodTracker.save(); }

                    ThemeManager.apply(SettingsService.settings.theme, { silent: true });
                    UI.renderAll();
                    NotificationCenter.push('Backup restored successfully', 'success');
                } catch (err) {
                    console.error(`${APP_NAME}: import failed.`, err);
                    NotificationCenter.push('Import failed — the file is not a valid HabitSystems backup.', 'error');
                }
            };
            reader.onerror = () => NotificationCenter.push('Could not read the selected file.', 'error');
            reader.readAsText(file);
        },

        triggerImportPicker() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.style.display = 'none';
            input.addEventListener('change', () => {
                if (input.files && input.files[0]) this.importJSON(input.files[0]);
                input.remove();
            });
            document.body.appendChild(input);
            input.click();
        },
    };

    /* ========================================================================
       27. HABIT ACTION HANDLERS (bridge between DOM events and services)
       ======================================================================== */

    const HabitActions = {
        toggleComplete(habitId) {
            const habit = HabitStore.getById(habitId);
            if (!habit) return;
            const wasCompleted = HabitLogic.isCompletedToday(habit);
            if (wasCompleted) {
                HabitLogic.undoComplete(habit);
            } else {
                const justCompleted = HabitLogic.markComplete(habit);
                if (justCompleted) this.onHabitCompleted(habit);
            }
            HabitStore.save();
            UI.patchHabitCard(habit);
            UI.renderDashboard();
            UI.renderProgressSection();
            UI.renderHeatmap();
            UI.renderCalendar();
            AchievementService.evaluateAll();
        },

        onHabitCompleted(habit) {
            GamificationService.award(XP_RULES.COMPLETE_HABIT, `Completed "${habit.title}"`);
            const hour = new Date().getHours();
            if (hour < 7) GamificationService.state.earlyBirdCompletions += 1;
            if (hour >= 22) GamificationService.state.nightOwlCompletions += 1;
            GamificationService.save();

            if (habit.streak > 0 && habit.streak % 7 === 0) GamificationService.award(XP_RULES.STREAK_7, `${habit.streak}-day streak on "${habit.title}"`);
            if (habit.streak > 0 && habit.streak % 30 === 0) GamificationService.award(XP_RULES.STREAK_30, `${habit.streak}-day streak on "${habit.title}"`);

            const active = HabitStore.getAll();
            const today = Utils.toISODate(new Date());
            if (active.length > 0 && active.every((h) => HabitLogic.isCompletedOn(h, today))) {
                GamificationService.award(XP_RULES.DAILY_GOAL, 'Completed every habit today');
            }
        },

        adjustProgress(habitId, delta) {
            const habit = HabitStore.getById(habitId);
            if (!habit) return;
            const wasCompleted = HabitLogic.isCompletedToday(habit);
            const justCompleted = delta > 0 ? HabitLogic.increment(habit, delta) : (HabitLogic.decrement(habit, Math.abs(delta)), false);
            HabitStore.save();
            if (!wasCompleted && HabitLogic.isCompletedToday(habit)) this.onHabitCompleted(habit);
            UI.patchHabitCard(habit);
            UI.renderDashboard();
            UI.renderProgressSection();
            AchievementService.evaluateAll();
        },

        toggleFavorite(habitId) {
            const habit = HabitStore.toggleFavorite(habitId);
            if (habit) UI.patchHabitCard(habit);
        },

        remove(habitId) {
            HabitStore.delete(habitId);
            UI.renderHabitList();
            UI.renderDashboard();
            UI.renderProgressSection();
            NotificationCenter.push('Habit deleted', 'info');
        },

        archive(habitId) {
            const habit = HabitStore.archive(habitId);
            if (habit) {
                UI.renderHabitList();
                UI.renderDashboard();
                NotificationCenter.push(`"${habit.title}" archived`, 'info');
            }
        },

        duplicate(habitId) {
            const copy = HabitStore.duplicate(habitId);
            if (copy) {
                UI.renderHabitList();
                NotificationCenter.push(`"${copy.title}" created`, 'success');
            }
        },
    };

    /* ========================================================================
       28. EVENT BINDINGS (delegation-first — a handful of root listeners)
       ======================================================================== */

    const EventBindings = {
        init() {
            this.bindModalTriggers();
            this.bindHabitListDelegation();
            this.bindForms();
            this.bindTopbar();
            this.bindSectionActions();
            this.bindRightSidebarWidgets();
            this.bindPomodoro();
            ModalManager.bindBackdropClose();
        },

        /* Any element with [data-modal-target] opens a dialog; [data-modal-close] closes it */
        bindModalTriggers() {
            document.body.addEventListener('click', (event) => {
                const opener = event.target.closest('[data-modal-target]');
                if (opener) {
                    const targetId = opener.getAttribute('data-modal-target');
                    if (targetId === 'editHabitModal') {
                        const card = opener.closest('[data-habit-id]');
                        const habit = card ? HabitStore.getById(card.dataset.habitId) : null;
                        if (habit) { AppUIState.selectedHabitId = habit.id; FormHelpers.fillEditHabitForm(habit); }
                    }
                    if (targetId === 'deleteConfirmModal') {
                        const card = opener.closest('[data-habit-id]');
                        if (card) ModalManager.pendingDeleteId = card.dataset.habitId;
                    }
                    if (targetId === 'journalEntryModal') {
                        FormHelpers.populateJournalHabitSelect();
                        document.getElementById('journalEntryDate').value = Utils.toISODate(new Date());
                    }
                    if (targetId === 'addHabitModal') {
                        FormHelpers.resetAddHabitForm(document.getElementById('addHabitForm'));
                    }
                    ModalManager.open(targetId);
                    return;
                }
                const closer = event.target.closest('[data-modal-close]');
                if (closer) ModalManager.close(closer.getAttribute('data-modal-close'));

                const achievementCard = event.target.closest('.achievement-card');
                if (achievementCard) this.openAchievementDetails(achievementCard.dataset.achievementId);
            });
        },

        openAchievementDetails(achievementId) {
            const def = ACHIEVEMENT_DEFS.find((d) => d.id === achievementId);
            if (!def) return;
            const unlocked = AchievementService.isUnlocked(def.id);
            document.querySelector('#achievementDetailsModal .achievement-details-icon i').className = `fa-solid ${def.icon}`;
            document.querySelector('.achievement-details-title').textContent = def.title;
            document.querySelector('.achievement-details-description').textContent = def.description;
            document.querySelector('.achievement-details-date').textContent = unlocked
                ? `Unlocked on ${Utils.formatFriendlyDate(AchievementService.unlocked[def.id])}`
                : 'Not yet unlocked — keep going!';
            ModalManager.open('achievementDetailsModal');
        },

        /* Single delegated listener handles every interactive control inside a habit card */
        bindHabitListDelegation() {
            const list = document.getElementById('habitCardsList');
            if (!list) return;

            list.addEventListener('change', (event) => {
                if (event.target.classList.contains('habit-checkbox')) {
                    const card = event.target.closest('[data-habit-id]');
                    if (card) HabitActions.toggleComplete(card.dataset.habitId);
                }
            });

            list.addEventListener('click', (event) => {
                const card = event.target.closest('[data-habit-id]');
                if (!card) return;
                const habitId = card.dataset.habitId;

                if (event.target.closest('.habit-increment-btn')) HabitActions.adjustProgress(habitId, 1);
                else if (event.target.closest('.habit-decrement-btn')) HabitActions.adjustProgress(habitId, -1);
                else if (event.target.closest('.favorite-btn')) HabitActions.toggleFavorite(habitId);
                else if (event.target.closest('.habit-archive-btn')) HabitActions.archive(habitId);
                else if (event.target.closest('.habit-duplicate-btn')) HabitActions.duplicate(habitId);
                else if (event.target.closest('.habit-notes-btn')) {
                    const habit = HabitStore.getById(habitId);
                    if (habit) DynamicDialogs.showNotes(habit);
                } else if (event.target.closest('.habit-card-main') && !event.target.closest('.habit-checkbox-wrapper')) {
                    list.querySelectorAll('.habit-card').forEach((el) => el.classList.remove('is-selected'));
                    card.classList.add('is-selected');
                    AppUIState.selectedHabitId = habitId;
                }
            });
        },

        bindForms() {
            // Add Habit
            const addForm = document.getElementById('addHabitForm');
            if (addForm) {
                document.getElementById('addHabitIconPicker')?.addEventListener('click', (event) => {
                    const option = event.target.closest('.icon-picker-option');
                    if (option) FormHelpers.selectIcon(document.getElementById('addHabitIconPicker'), option);
                });
                addForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    Validator.clearFieldErrors(addForm);
                    const payload = {
                        title: document.getElementById('addHabitName').value,
                        category: document.getElementById('addHabitCategory').value,
                        icon: FormHelpers.getSelectedIcon(document.getElementById('addHabitIconPicker')),
                        color: document.getElementById('addHabitColor').value,
                        frequency: document.getElementById('addHabitFrequency').value,
                        reminder: document.getElementById('addHabitReminderTime').value,
                        goal: document.getElementById('addHabitGoal').value,
                        notes: document.getElementById('addHabitNotes').value,
                        priority: addForm.querySelector('input[name="priority"]:checked')?.value || 'medium',
                    };
                    const { valid, errors } = Validator.validateHabitForm(payload);
                    if (!valid) {
                        if (errors.title) Validator.showFieldError(document.getElementById('addHabitName'), errors.title);
                        if (errors.goal) Validator.showFieldError(document.getElementById('addHabitGoal'), errors.goal);
                        return;
                    }
                    const habit = HabitStore.create(payload);
                    UI.renderHabitList();
                    UI.renderDashboard();
                    UI.renderProgressSection();
                    AchievementService.evaluateAll();
                    NotificationCenter.push(`"${habit.title}" added`, 'success');
                    ModalManager.close('addHabitModal');
                });
            }

            // Edit Habit
            const editForm = document.getElementById('editHabitForm');
            if (editForm) {
                document.getElementById('editHabitIconPicker')?.addEventListener('click', (event) => {
                    const option = event.target.closest('.icon-picker-option');
                    if (option) FormHelpers.selectIcon(document.getElementById('editHabitIconPicker'), option);
                });
                editForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    Validator.clearFieldErrors(editForm);
                    const habitId = AppUIState.selectedHabitId;
                    if (!habitId) return;
                    const payload = {
                        title: document.getElementById('editHabitName').value,
                        category: document.getElementById('editHabitCategory').value,
                        icon: FormHelpers.getSelectedIcon(document.getElementById('editHabitIconPicker')),
                        color: document.getElementById('editHabitColor').value,
                        frequency: document.getElementById('editHabitFrequency').value,
                        reminder: document.getElementById('editHabitReminderTime').value,
                        goal: document.getElementById('editHabitGoal').value,
                        notes: document.getElementById('editHabitNotes').value,
                    };
                    const { valid, errors } = Validator.validateHabitForm(payload, { editingId: habitId });
                    if (!valid) {
                        if (errors.title) Validator.showFieldError(document.getElementById('editHabitName'), errors.title);
                        if (errors.goal) Validator.showFieldError(document.getElementById('editHabitGoal'), errors.goal);
                        return;
                    }
                    HabitStore.update(habitId, { ...payload, goal: Number(payload.goal) || 1 });
                    UI.renderHabitList();
                    UI.renderDashboard();
                    NotificationCenter.push('Habit updated', 'success');
                    ModalManager.close('editHabitModal');
                });
            }

            // Delete confirmation
            document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
                if (ModalManager.pendingDeleteId) {
                    HabitActions.remove(ModalManager.pendingDeleteId);
                    ModalManager.pendingDeleteId = null;
                }
                ModalManager.close('deleteConfirmModal');
            });

            // Settings
            const settingsForm = document.getElementById('settingsForm');
            if (settingsForm) {
                document.getElementById('darkModeToggle')?.addEventListener('change', (event) => {
                    ThemeManager.apply(event.target.checked ? 'dark' : 'light');
                });
                settingsForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    SettingsService.update({
                        notifications: document.getElementById('notificationToggle').checked,
                        reminderSound: document.getElementById('reminderSoundSelect').value,
                        language: document.getElementById('languageSelect').value,
                    });
                    if (SettingsService.settings.notifications) NotificationService.requestPermission();
                    NotificationCenter.push('Settings saved', 'success');
                    ModalManager.close('settingsModal');
                });
            }
            document.getElementById('exportDataBtn')?.addEventListener('click', () => DataPortability.exportJSON());
            document.getElementById('importDataBtn')?.addEventListener('click', () => DataPortability.triggerImportPicker());
            document.getElementById('resetDataBtn')?.addEventListener('click', () => {
                if (!window.confirm('This will permanently erase all HabitSystems data on this device. Continue?')) return;
                Storage.clearAll();
                window.location.reload();
            });

            // Journal entry form
            const journalForm = document.getElementById('journalEntryForm');
            if (journalForm) {
                journalForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    Validator.clearFieldErrors(journalForm);
                    const payload = {
                        date: document.getElementById('journalEntryDate').value,
                        habitId: document.getElementById('journalEntryHabit').value,
                        mood: journalForm.querySelector('input[name="mood"]:checked')?.value || 'good',
                        notes: document.getElementById('journalEntryNotes').value,
                    };
                    const { valid, errors } = Validator.validateJournalForm(payload);
                    if (!valid) {
                        if (errors.notes) Validator.showFieldError(document.getElementById('journalEntryNotes'), errors.notes);
                        return;
                    }
                    JournalStore.create(payload);
                    UI.renderJournal();
                    GamificationService.award(10, 'Journal entry added');
                    journalForm.reset();
                    ModalManager.close('journalEntryModal');
                });
            }
        },

        bindSectionActions() {
            // Today's Habits: search / filter / sort
            const habitSearch = document.getElementById('habitSearchInput');
            if (habitSearch) {
                habitSearch.addEventListener('input', Utils.debounce((event) => {
                    AppUIState.searchQuery = event.target.value;
                    UI.renderHabitList();
                }, 200));
            }
            document.getElementById('filterHabitsBtn')?.addEventListener('click', () => DynamicDialogs.ensureFilterDialog().showModal());
            document.getElementById('sortHabitsBtn')?.addEventListener('click', () => DynamicDialogs.ensureSortDialog().showModal());

            // Journal search / delete / read more — delegated on the list container
            const journalList = document.getElementById('journalCardsList');
            if (journalList) {
                journalList.addEventListener('click', (event) => {
                    const card = event.target.closest('[data-journal-id]');
                    if (!card) return;
                    if (event.target.closest('.journal-delete-btn')) {
                        JournalStore.delete(card.dataset.journalId);
                        UI.renderJournal();
                        NotificationCenter.push('Journal entry deleted', 'info');
                    } else if (event.target.closest('.read-more-btn')) {
                        const preview = card.querySelector('.journal-notes-preview');
                        const btn = event.target.closest('.read-more-btn');
                        const expanded = preview.style.webkitLineClamp === 'unset';
                        preview.style.webkitLineClamp = expanded ? '3' : 'unset';
                        btn.textContent = expanded ? 'Read More' : 'Show Less';
                    }
                });
            }

            // Calendar navigation
            document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
                CalendarService.goToPrevMonth();
                UI.renderCalendar();
            });
            document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
                CalendarService.goToNextMonth();
                UI.renderCalendar();
            });

            // Sidebar navigation smooth-scroll + active state
            document.querySelectorAll('.nav-link[data-section]').forEach((link) => {
                link.addEventListener('click', (event) => {
                    const targetId = link.getAttribute('data-section');
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        event.preventDefault();
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
                        link.closest('.nav-item')?.classList.add('active');
                    }
                });
            });

            document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
                document.getElementById('sidebar')?.classList.toggle('sidebar-collapsed');
            });
            document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
                document.getElementById('sidebar')?.classList.toggle('sidebar-open');
            });
            document.getElementById('logoutBtn')?.addEventListener('click', () => {
                NotificationCenter.push('Logged out (demo only — no backend connected)', 'info');
            });
        },

        bindTopbar() {
            document.getElementById('themeToggleBtn')?.addEventListener('click', () => ThemeManager.toggle());

            const globalSearch = document.getElementById('globalSearch');
            if (globalSearch) {
                globalSearch.addEventListener('input', Utils.debounce((event) => {
                    AppUIState.searchQuery = event.target.value;
                    AppUIState.journalQuery = event.target.value;
                    UI.renderHabitList();
                    UI.renderJournal();
                }, 250));
            }

            document.getElementById('notificationBtn')?.addEventListener('click', () => {
                NotificationCenter.markAllRead();
            });
        },

        bindRightSidebarWidgets() {
            document.getElementById('addWaterGlassBtn')?.addEventListener('click', () => WaterTracker.add(1));
            document.getElementById('waterIntakeValue')?.addEventListener('click', () => WaterTracker.add(-1));
            document.getElementById('sleepHoursCard')?.addEventListener('click', (event) => {
                if (!event.target.closest('button')) SleepTracker.cyclePreset();
            });

            document.querySelectorAll('#moodTrackerCard .mood-option-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const label = (btn.getAttribute('aria-label') || '').replace('Mood: ', '').toLowerCase();
                    document.querySelectorAll('#moodTrackerCard .mood-option-btn').forEach((b) => b.setAttribute('aria-pressed', 'false'));
                    btn.setAttribute('aria-pressed', 'true');
                    MoodTracker.setToday(label);
                    NotificationCenter.push(`Mood logged: ${Utils.capitalize(label)}`, 'info');
                });
            });

            document.getElementById('askCoachBtn')?.addEventListener('click', () => {
                const active = HabitStore.getAll();
                const suggestion = active.length
                    ? `Try tackling "${active[Math.floor(Math.random() * active.length)].title}" first today — it tends to set your tone.`
                    : 'Add a habit to get personalized coaching tips!';
                NotificationCenter.push(suggestion, 'info');
            });

            document.querySelectorAll('.suggested-habit-item .btn-icon-outline').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const title = btn.closest('.suggested-habit-item')?.querySelector('.suggested-habit-name')?.textContent.trim();
                    if (!title) return;
                    HabitStore.create({ title, category: 'personal-growth', goal: 1, frequency: 'daily' });
                    UI.renderHabitList();
                    UI.renderDashboard();
                    NotificationCenter.push(`"${title}" added to your habits`, 'success');
                });
            });
        },

        bindPomodoro() {
            document.getElementById('pomodoroStartBtn')?.addEventListener('click', () => PomodoroTimer.start());
            document.getElementById('pomodoroPauseBtn')?.addEventListener('click', () => PomodoroTimer.pause());
            document.getElementById('pomodoroResetBtn')?.addEventListener('click', () => PomodoroTimer.reset());
        },
    };

    /* ========================================================================
       29. KEYBOARD SHORTCUTS
       ======================================================================== */

    const KeyboardShortcuts = {
        init() {
            document.addEventListener('keydown', (event) => {
                const isCtrlOrCmd = event.ctrlKey || event.metaKey;

                if (isCtrlOrCmd && event.key.toLowerCase() === 'n') {
                    event.preventDefault();
                    FormHelpers.resetAddHabitForm(document.getElementById('addHabitForm'));
                    ModalManager.open('addHabitModal');
                    return;
                }
                if (isCtrlOrCmd && event.key.toLowerCase() === 'f') {
                    event.preventDefault();
                    document.getElementById('globalSearch')?.focus();
                    return;
                }
                if (event.key === 'Escape') {
                    ModalManager.closeAll();
                    return;
                }
                if (event.key === 'Delete' && AppUIState.selectedHabitId) {
                    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
                    if (isTyping) return;
                    ModalManager.pendingDeleteId = AppUIState.selectedHabitId;
                    ModalManager.open('deleteConfirmModal');
                }
            });
        },
    };

    /* ========================================================================
       30. LIVE CLOCK
       ======================================================================== */

    const Clock = {
        start() {
            setInterval(() => UI.renderClock(), 1000 * 30);
        },
    };

    /* ========================================================================
       31. APP BOOTSTRAP
       ======================================================================== */

    const App = {
        init() {
            try {
                UI.cacheSelectors();
                NotificationCenter.init();

                ThemeManager.init();
                HabitStore.load();
                JournalStore.load();
                AchievementService.load();
                SettingsService.load();
                GamificationService.load();
                WaterTracker.load();
                SleepTracker.load();
                MoodTracker.load();

                StatsService.compute();
                UI.renderAll();
                PomodoroTimer.init();

                EventBindings.init();
                KeyboardShortcuts.init();
                Clock.start();
                ReminderService.startWatcher();
                AchievementService.evaluateAll();

                document.body.classList.add('animate-fade-in');
                console.info(`${APP_NAME} v${APP_VERSION} ready.`);
            } catch (err) {
                console.error(`${APP_NAME}: initialization failed.`, err);
                NotificationCenter && NotificationCenter.push
                    ? NotificationCenter.push('Something went wrong while starting HabitSystems. Please refresh.', 'error')
                    : window.alert('HabitSystems failed to start. Please refresh the page.');
            }
        },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

    /* Debug handle for the console — not part of the public API */
    window.HabitSystems = {
        HabitStore, JournalStore, AchievementService, GamificationService, SettingsService,
        StatsService, CalendarService, HeatmapService, WaterTracker, SleepTracker, MoodTracker,
        PomodoroTimer, DataPortability, version: APP_VERSION,
    };
})();
