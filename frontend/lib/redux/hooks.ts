import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store'; // Apne store file se types import karein

// Ab se poore app mein plain `useDispatch` aur `useSelector` ki jagah inka istemaal karein
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;