import { Forgot, Login, SignUp, Splash, Welcome } from "./components/auth";
import {
    Analyzing,
    Assessment,
    AssessmentReport,
    Compare,
    HomeDash,
    MajorDetails,
    Report,
    Results,
} from "./components/main";
import { Onboarding, Setup } from "./components/onboarding";
import {
    Chat,
    EditAccount,
    Explore, Market,
    Notifications,
    Premium,
    Profile,
    Scholarships,
    Settings, Shortlist,
} from "./components/screens";
import { NavProvider, PhoneFrame, useNav } from "./components/shell";
import { Universities } from "./components/universities";

function Router() {
  const { screen } = useNav();
  switch (screen) {
    case "splash": return <Splash />;
    case "welcome": return <Welcome />;
    case "login": return <Login />;
    case "signup": return <SignUp />;
    case "forgot": return <Forgot />;
    case "onboarding": return <Onboarding />;
    case "setup": return <Setup />;
    case "home": return <HomeDash />;
    case "assessment": return <Assessment />;
    case "assessmentReport": return <AssessmentReport />;
    case "analyzing": return <Analyzing />;
    case "results": return <Results />;
    case "major": return <MajorDetails />;
    case "compare": return <Compare />;
    case "explore": return <Explore />;
    case "universities": return <Universities />;
    case "market": return <Market />;
    case "scholarships": return <Scholarships />;
    case "chat": return <Chat />;
    case "shortlist": return <Shortlist />;
    case "notifications": return <Notifications />;
    case "profile": return <Profile />;
    case "settings": return <Settings />;
    case "editAccount": return <EditAccount />;
    case "premium": return <Premium />;
    case "report": return <Report />;
    default: return <Splash />;
  }
}

export default function App() {
  return (
    <NavProvider>
      <PhoneFrame>
        <Router />
      </PhoneFrame>
    </NavProvider>
  );
}
