all: \
	hello.txt.gz

%.gz: %
	gzip --keep $^ --name $^ --force
