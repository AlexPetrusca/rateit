const ALLOWED_BACK_PATHS = [/^\/$/, /^\/following$/, /^\/users\/\d+/];

const stack = [];

export const recordPath = (pathname) => {
    if (stack[stack.length - 1] !== pathname) {
        stack.push(pathname);
        if (stack.length > 10) stack.shift();
    }
};

export const getPreviousPath = () => stack[stack.length - 2] ?? null;

export const getBackTarget = () => {
    const prev = getPreviousPath();
    if (prev && ALLOWED_BACK_PATHS.some((re) => re.test(prev))) return -1;
    return '/';
};
