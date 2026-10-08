#!/usr/bin/python3
"""Use the trusted Lium CLI lifecycle with an enforced total hourly rent cap."""
import math
import sys


def bounded_rent(original, maximum, gpu, count):
    def rent(client, *args, **kwargs):
        from lium.sdk.client import RENT_BY_SPEC
        if args or not client.supports(RENT_BY_SPEC) or kwargs.get('gpu_type') != gpu or kwargs.get('gpu_count', 1) != count:
            raise ValueError('bounded provider rent identity differs')
        cap = maximum / count
        existing = kwargs.get('max_price_per_gpu_hour')
        if existing is not None:
            if isinstance(existing, bool) or not isinstance(existing, (int, float)) or not math.isfinite(existing) or existing <= 0:
                raise ValueError('invalid provider price ceiling')
            cap = min(cap, existing)
        kwargs['max_price_per_gpu_hour'] = cap
        return original(client, **kwargs)
    return rent


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 5:
        raise ValueError('invalid bounded rent parameters')
    gpu, count_text, ttl_text, budget_text, maximum_text = argv
    count, ttl, budget, maximum = int(count_text), float(ttl_text), float(budget_text), float(maximum_text)
    if (gpu not in ('H100', 'A100', 'L40S', 'RTX6000', 'RTXPRO6000') or count not in (1, 2)
            or not all(math.isfinite(x) for x in (ttl, budget, maximum))
            or not 0 < ttl <= 3 or not 0 < budget <= 20 or not 0 < maximum <= 5):
        raise ValueError('bounded rent parameters exceed original caps')
    from lium.sdk import Lium
    from lium.cli.cli import main as cli_main
    Lium.rent = bounded_rent(Lium.rent, maximum, gpu, count)
    # This retains CLI provider TTL scheduling, budget, ready wait and JSON result.
    cli_main(args=['up', '--gpu', gpu, '-c', str(count), '--ttl', f'{ttl}h',
                   '--budget', f'{budget:.2f}', '-y', '--json'], prog_name='lium')


if __name__ == '__main__':
    main()
