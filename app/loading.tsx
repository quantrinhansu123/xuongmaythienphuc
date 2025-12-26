import LoaderApp from "@/components/LoaderApp";

export default function LoadingPage() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 fixed top-[50%] left-[50%] flex min-h-screen transform flex-col items-center justify-center text-center">
      <LoaderApp />
    </div>
  );
}
