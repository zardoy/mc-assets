/// <reference types="@rsbuild/core/types" />
import { renderToDom } from '@zardoy/react-util'
import 'tailwindcss/tailwind.css'
import App from './App'

window.addEventListener('load', () => {
    renderToDom(<App />)
})
