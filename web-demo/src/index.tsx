/// <reference types="@rsbuild/core/types" />
import { renderToDom } from '@zardoy/react-util'
import 'tailwindcss/tailwind.css'
import App from './App'

renderToDom(<App />, {
    // todo switch back to root once rsbuild issue with inlining scripts in head is fixed
    selector: 'body',
})
