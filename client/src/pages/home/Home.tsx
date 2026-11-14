import { Separator } from "@/components/ui/separator";

import Hero from "./Hero";
import Main from "./Main";
import ErrorBoundary from "@/components/custom/ErrorBoundary";

function Home() {
  return (
    <div className="py-10 ">
      {/* Hero Section */}

      <div className="">
        <ErrorBoundary>
          <Hero />
        </ErrorBoundary>
      </div>

      <Separator className="my-6" />

      {/* Posts Section  */}
      <ErrorBoundary>
        <Main />
      </ErrorBoundary>
    </div>
  );
}

export default Home;
