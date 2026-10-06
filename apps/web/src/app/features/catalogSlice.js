import { createSlice } from '@reduxjs/toolkit'
import { CATALOG } from '../../data/catalog'
import { DEFAULT_FILTERS, applyFilters } from './catalogFilters'

export { DEFAULT_FILTERS, applyFilters } from './catalogFilters'

const { listings, sellers } = CATALOG

const catalogSlice = createSlice({
  name: 'catalog',
  initialState: {
    listings,
    sellers,
    filters: DEFAULT_FILTERS,
    results: applyFilters(listings, DEFAULT_FILTERS),
    compared: [],
    page: 1,
    perPage: 12,
    view: 'grid',
    loading: false,
  },
  reducers: {
    setFilter: (s, a) => {
      s.filters = { ...s.filters, ...a.payload }
      s.results = applyFilters(s.listings, s.filters)
      s.page = 1
    },
    toggleArrayFilter: (s, a) => {
      const { key, value } = a.payload
      const list = s.filters[key]
      s.filters[key] = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
      s.results = applyFilters(s.listings, s.filters)
      s.page = 1
    },
    resetFilters: (s) => {
      s.filters = DEFAULT_FILTERS
      s.results = applyFilters(s.listings, DEFAULT_FILTERS)
      s.page = 1
    },
    setPage: (s, a) => {
      s.page = a.payload
    },
    setView: (s, a) => {
      s.view = a.payload
    },
    toggleCompare: (s, a) => {
      const id = a.payload
      s.compared = s.compared.includes(id)
        ? s.compared.filter((x) => x !== id)
        : [...s.compared, id].slice(-3)
    },
    clearCompare: (s) => {
      s.compared = []
    },
    addListing: (s, a) => {
      s.listings = [a.payload, ...s.listings]
      s.results = applyFilters(s.listings, s.filters)
    },
  },
})

export const {
  setFilter,
  toggleArrayFilter,
  resetFilters,
  setPage,
  setView,
  toggleCompare,
  clearCompare,
  addListing,
} = catalogSlice.actions

export const selectListing = (id) => (state) => state.catalog.listings.find((l) => l.id === id || l.slug === id)
export const selectPaged = (state) => {
  const { results, page, perPage } = state.catalog
  return results.slice((page - 1) * perPage, page * perPage)
}

export default catalogSlice.reducer
