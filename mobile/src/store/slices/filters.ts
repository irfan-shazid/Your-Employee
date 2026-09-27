import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** Search filters survive navigation, so going back to a list keeps what the user picked. */
type ListFilters = {
  categoryId?: string;
  division?: string;
  district?: string;
  q?: string;
};

export type JobFilters = ListFilters & { sort: 'newest' | 'wage' | 'start'; urgent?: 'true' };
export type WorkerFilters = ListFilters & { sort: 'rating' | 'experience' | 'wage' | 'newest'; minRating?: number };

type FiltersState = { jobs: JobFilters; workers: WorkerFilters };

const initialState: FiltersState = {
  jobs: { sort: 'newest' },
  workers: { sort: 'rating' },
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setJobFilters(state, action: PayloadAction<Partial<JobFilters>>) {
      state.jobs = { ...state.jobs, ...action.payload };
    },
    resetJobFilters(state) {
      state.jobs = initialState.jobs;
    },
    setWorkerFilters(state, action: PayloadAction<Partial<WorkerFilters>>) {
      state.workers = { ...state.workers, ...action.payload };
    },
    resetWorkerFilters(state) {
      state.workers = initialState.workers;
    },
  },
});

export const { setJobFilters, resetJobFilters, setWorkerFilters, resetWorkerFilters } = filtersSlice.actions;
export default filtersSlice.reducer;
