import { Link, useLocation } from "react-router-dom";

type SideMenuProps = {};

type MenuItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
};

const FileIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const ConvertIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);

const SendIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const menuItems: MenuItem[] = [
  {
    path: "/",
    label: "Générer",
    icon: <FileIcon />,
  },
  {
    path: "/convert",
    label: "Convertir",
    icon: <ConvertIcon />,
  },
  {
    path: "/send",
    label: "Envoyer",
    icon: <SendIcon />,
  },
];

export function SideMenu({}: SideMenuProps) {
  const location = useLocation();

  return (
    <nav className="w-56 min-h-screen bg-gradient-to-b from-sky-400 to-sky-500 flex flex-col py-6 px-4 shadow-xl">
      {/* Logo / Header */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md">
          <svg
            className="w-6 h-6 text-sky-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">ADAM</h1>
          <p className="text-xs text-sky-100">Ordonnances</p>
        </div>
      </div>

      {/* Menu Items */}
      <ul className="flex flex-col gap-1 flex-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200 font-medium
                  ${
                    isActive
                      ? "bg-white text-sky-600 shadow-lg"
                      : "text-white hover:bg-white/20"
                  }
                `}
              >
                <span className={isActive ? "text-sky-500" : "text-white"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-sky-300/30">
        <p className="text-xs text-sky-100 text-center">v0.1.0</p>
      </div>
    </nav>
  );
}
