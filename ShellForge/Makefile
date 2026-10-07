CC = gcc
CFLAGS = -Wall -Wextra -g -Iinclude
LDFLAGS = -pthread

SRC = src/main.c \
      src/input.c \
      src/parser.c \
      src/process.c \
      src/builtin.c \
      src/fileops.c \
      src/search.c \
      src/perms.c \
      src/signals.c \
      src/pipes.c \
      src/redirect.c \
      src/thread.c

TARGET = bin/shellforge

all: $(TARGET)

$(TARGET): $(SRC)
	mkdir -p bin
	$(CC) $(CFLAGS) $(SRC) $(LDFLAGS) -o $(TARGET)

asan: $(SRC)
	mkdir -p bin
	$(CC) $(CFLAGS) -fsanitize=address $(SRC) $(LDFLAGS) -o $(TARGET)

run: $(TARGET)
	./$(TARGET)

clean:
	rm -rf bin/*

.PHONY: all asan run clean
