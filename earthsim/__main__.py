import sys

def main(args=None):
    try:
        import pyct.cmd
    except ImportError:
        from . import _missing_cmd
        print(_missing_cmd())
        sys.exit(1)
    return pyct.cmd.substitute_main('earthsim',args=args)

if __name__ == "__main__":
    main()