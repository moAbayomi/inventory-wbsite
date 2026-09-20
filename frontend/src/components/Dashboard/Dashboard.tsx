import { DashHeader } from "./DashHeader";
import { Links } from "./Links";
import { NavLink } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { navLinkClasses } from "./navLinkClasses";

function Dashboard() {
  return (
    <div className="flex flex-col">
      <DashHeader />
      <nav className="flex flex-col gap-1 px-3 pt-4">
        <NavLink to="/" end className={({ isActive }) => navLinkClasses(isActive)}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>
        <Links />
        
      </nav>
    </div>
  );
}
export default Dashboard;