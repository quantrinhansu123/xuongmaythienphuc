"use client";

import NextError from "next/error";

const GlobalError = ({
  error,
  reset,
}: {
  error: globalThis.Error;
  reset: () => void;
}) => {
  console.error(error);

  return (
    <html lang="vi">
      <body>
        <NextError statusCode={500} />
        <button
          className="mt-4 flex min-h-screen flex-col items-center justify-center rounded-md bg-primary px-4 py-2 text-center text-sm text-white transition-colors hover:bg-primary-dark"
          onClick={() => reset()}
        >
          Thử lại
        </button>
      </body>
    </html>
  );
};
export default GlobalError;
