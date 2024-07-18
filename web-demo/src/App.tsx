import { RouterProvider, createHashRouter, Outlet, Link, redirect } from 'react-router-dom'
import AtlasExplorer from './pages/AtlasExplorer'

export default function App() {
    return <MainRouter />
}

const router = createHashRouter([
    {
        path: '/',
        Component: View,
        children: [
            {
                path: '',
                loader: () => redirect('/atlas-explorer'),
            },
            {
                path: 'atlas-explorer',
                element: <AtlasExplorer />,
            }
        ],
    }
])

const MainRouter = () => {
    return <RouterProvider router={router} />
}

function View() {
    return <div>
        {router.routes[0]!.children!.map(route => {
            return <RouterTabButton key={route.path} to={route.path} active={route.path === router.state.location.pathname}>{route.path}</RouterTabButton>
        })}
        <Outlet />
    </div>
}

const RouterTabButton = ({active = false, children, to}) => {
    return <Link className={`${active ? 'bg-gray-200' : 'bg-white'} rounded-lg px-4 py-2 text-sm font-medium`} to={to}>{children}</Link>
}
