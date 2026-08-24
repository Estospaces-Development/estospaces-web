import { useCallback, useEffect, useRef } from 'react';
import {
    createSearchParams,
    useSearchParams,
    type NavigateOptions,
    type SetURLSearchParams,
} from 'react-router-dom';

export const useSerializedSearchParams = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const latestParamsRef = useRef(new URLSearchParams(searchParams));
    const searchParamsKey = searchParams.toString();

    useEffect(() => {
        latestParamsRef.current = new URLSearchParams(searchParams);
    }, [searchParams, searchParamsKey]);

    const setSerializedSearchParams = useCallback<SetURLSearchParams>((nextInit, options?: NavigateOptions) => {
        const previous = new URLSearchParams(latestParamsRef.current);
        const next = typeof nextInit === 'function'
            ? nextInit(previous)
            : nextInit;
        const serialized = createSearchParams(next);

        latestParamsRef.current = new URLSearchParams(serialized);
        setSearchParams(serialized, options);
    }, [setSearchParams]);

    return [searchParams, setSerializedSearchParams] as const;
};
