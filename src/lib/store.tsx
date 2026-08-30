import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { AppState, Entry, Profile, Settings, Workout, defaultSettings, uid } from './types';

const STORAGE_KEY = 'trace:v1';

type Action =
  | { type: 'hydrate'; payload: Partial<AppState> }
  | { type: 'completeOnboarding'; profile: Profile; settings: Partial<Settings> }
  | { type: 'updateProfile'; patch: Partial<Profile> }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'startWorkout' }
  | { type: 'setEntries'; entries: Entry[] }
  | { type: 'discardWorkout' }
  | { type: 'completeWorkout' }
  | { type: 'deleteWorkout'; id: string }
  | { type: 'resetAll' };

const initialState: AppState = {
  hydrated: false,
  profile: null,
  settings: defaultSettings,
  workouts: [],
  active: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.payload, hydrated: true };
    case 'completeOnboarding':
      return {
        ...state,
        profile: action.profile,
        settings: { ...state.settings, ...action.settings },
      };
    case 'updateProfile':
      return state.profile
        ? { ...state, profile: { ...state.profile, ...action.patch } }
        : state;
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'startWorkout':
      if (state.active) return state;
      return {
        ...state,
        active: { id: uid(), startedAt: Date.now(), completedAt: null, entries: [] },
      };
    case 'setEntries':
      return state.active
        ? { ...state, active: { ...state.active, entries: action.entries } }
        : state;
    case 'discardWorkout':
      return { ...state, active: null };
    case 'completeWorkout': {
      if (!state.active) return state;
      const kept = state.active.entries.filter((e) => e.raw.trim().length > 0);
      if (kept.length === 0) return { ...state, active: null };
      const done: Workout = { ...state.active, entries: kept, completedAt: Date.now() };
      return { ...state, active: null, workouts: [done, ...state.workouts] };
    }
    case 'deleteWorkout':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) };
    case 'resetAll':
      return { ...initialState, hydrated: true };
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (cancelled) return;
        if (json) {
          try {
            const data = JSON.parse(json);
            dispatch({
              type: 'hydrate',
              payload: {
                profile: data.profile ?? null,
                settings: { ...defaultSettings, ...(data.settings ?? {}) },
                workouts: Array.isArray(data.workouts) ? data.workouts : [],
                active: data.active ?? null,
              },
            });
            return;
          } catch {
            // fall through to empty hydrate
          }
        }
        dispatch({ type: 'hydrate', payload: {} });
      })
      .catch(() => dispatch({ type: 'hydrate', payload: {} }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced persistence — typing in the logger dispatches often.
  useEffect(() => {
    if (!state.hydrated) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      const { profile, settings, workouts, active } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, settings, workouts, active })).catch(
        () => {},
      );
    }, 250);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function useResetAll() {
  const { dispatch } = useStore();
  return useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    dispatch({ type: 'resetAll' });
  }, [dispatch]);
}
