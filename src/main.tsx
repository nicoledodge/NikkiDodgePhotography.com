import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import NikkiDodgePhotography from './NikkiDodgePhotography.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NikkiDodgePhotography />
  </StrictMode>,
)
