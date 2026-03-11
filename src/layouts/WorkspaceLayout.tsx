import { Outlet, NavLink } from 'react-router-dom';

export function WorkspaceLayout() {
  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-lg font-bold text-white tracking-tight">Ares Nebu</h1>
          <p className="text-xs text-gray-500 mt-0.5">Business OS</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider mb-3 px-3">Workspace</p>
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/contacts"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                Contacts
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                Projects
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/finance"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                Finance
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <NavLink
            to="/studio"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            Open Studio
          </NavLink>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 shrink-0">
          {/* Placeholder — business top-nav components will be ported here */}
          <p className="text-sm text-gray-500">Top Navigation — placeholder</p>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gray-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
