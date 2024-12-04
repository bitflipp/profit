default: frontend

clean:
	rm -rf dist

setup:
	cd benchmark && yarn
	cd cli && yarn
	cd common && yarn
	cd frontend && yarn

frontend:
	cd frontend && yarn dev

cli:
	cd cli && yarn run cli

benchmark:
	cd benchmark && yarn run benchmark

lint:
	cd benchmark && yarn lint
	cd cli && yarn lint
	cd common && yarn lint
	cd frontend && yarn lint

audit:
	cd benchmark && yarn audit
	cd cli && yarn audit
	cd common && yarn audit
	cd frontend && yarn audit

upgrade:
	cd benchmark && yarn upgrade
	cd frontend && yarn upgrade
	cd common && yarn upgrade
	cd cli && yarn upgrade

test:
	cd common && yarn test

cover:
	cd common && yarn cover
