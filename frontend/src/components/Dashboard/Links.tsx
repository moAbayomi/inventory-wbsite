import { NavLink } from "react-router-dom";
import { Package, Tags, User, BadgeDollarSign } from "lucide-react";
import { navLinkClasses } from "./navLinkClasses";
import { useAuth } from "../../hooks/useAuth";


// `to` is an optional override for links whose route doesn't match
// "/" + label.toLowerCase() -- Sales is the one case: the label still says
// "Sales" (checkout is the everyday action), but its route is /sales/new
// now that /sales itself is the history list.
const links = [
  { label: "Inventory", icon: Package },
  { label: "Categories", icon: Tags },
  { label: "Sales", icon: BadgeDollarSign, to: "/sales/new" },
];

const adminLinks = [
  { label: "Users", icon: User }
]

export function Links() {
  const { isAdmin } = useAuth()
  return (
    <>
      {links.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={label}
          to={to ?? `/${label.toLowerCase().replace(/ /g, "-")}`}
          className={({ isActive }) => navLinkClasses(isActive)}
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}

      {isAdmin && (
        adminLinks.map(({ label, icon: Icon }) => (
          <NavLink
            key={label}
            to={`/${label.toLowerCase().replace(/ /g, "-")}`}
            className={({ isActive }) => navLinkClasses(isActive)}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        )))}
    </>
  );
}