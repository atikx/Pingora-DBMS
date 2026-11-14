import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.log(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
            <h1 className="text-3xl">Some unexpected Error Occured</h1>
        </div>
      );
    }
    return this.props.children;
  }
}
