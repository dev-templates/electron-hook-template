.PHONY: upgrade clean

upgrade:
	yarn upgrade-interactive --latest

clean:
	rm -fr node_modules yarn.lock
