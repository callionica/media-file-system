# Callionica Media File System

The "Callionica Media File System" (**CMFS**) is a set of rules for connecting multiple files into 
a single entity, so that separate audio, video, text, subtitle, and image files can all be treated
as one item.

CMFS does this using only the file name and local directory structure to store data and metadata.

CMFS also allows for files found in multiple different folders to be recognized as part of a single entity.

It works like this:

A **media item** is an audio or video file.
An audio or video file is recognized by its file exension.

A **satellite item** is a text, image, subtitle, or other file whose name is prefixed by the name of a media item followed by a period. (The period can serve double duty as the separator between the file name and the file extension).

A **tag list** is a period-separated list of tags that can appear as a suffix to the file name of a satellite item.

A **tag** is just some text that does not contain a period. Examples include language tags like *en* or *da* to specify the language for subtitles, or image tags like *poster* or *backdrop*.

A **collection** is defined by the folder in which a media item finds itself.

A **collection satellite item** is a file contained directly within a collection folder or in the parent of that folder whose name is prefixed by the name of the collection followed by a period.

A **group** is the major grouping for media items. For example, a show (for television) or an artist (for music) or the author (for an audiobook). The group is recognized by using a regular expression to parse the media item's filename. If no group is recognized from the file name, the name of the grandparent folder is the name of the group.

A **group satellite item** is a file in the same folder as the media item or in the parent of that folder whose name is prefixed by the name of the group followed by a period.

A **subgroup** is the minor grouping for media items. For example, a season (for television) or an album (for music) or the book (for an audiobook). The subgroup is recognized by using a regular expression to parse the media item's filename. If no subgroup is recognized from the file name, the name of the parent folder is the name of the subgroup.

If the name of the subgroup was obtained from the parent folder, and the name of the group is the same as the name of the subgroup, but the name of the group is different from the name of the grandparent folder, there is no subgroup.

_Consider two cases: 1) Nested folders with an artist and an eponymous album 2) A single folder for the artist with audio files which also contain the artist name, but not the album name. In the first case, we want to allow group and subgroup to have the same name - we clearly have both. In the second case, we want to recognise that we don't have a subgroup._

A **subgroup satellite item** is a file in the same folder as the media item or in the parent of that folder whose name is prefixed by the name of the subgroup followed by a period.

## Regular expressions

CMFS applies regular expressions to extract data. CMFS applies each regular expression to only the file name (not the full path) of media files. CMFS does not constrain which particular regular expressions to apply to file names to extract data.

CMFS regular expressions can provide the following items of data:
1. group (e.g. Artist, Author, Show)
2. subgroup (e.g. Album, Book, Season)
3. number (e.g. Track number, Chapter number, Episode number)
4. date (e.g. Publication date)
5. name (e.g. Track name, Chapter name, Episode name)

Of these, only a name is required to be able to display a media item and if no regular expression matches, the entire filename will be used as the name.

## Storage Recommendations

There are two main recommended ways of storing media files: flat and hierarchical.

The flat layout puts the group, subgroup, number, and name directly in the filename. Typically, it will also separate files into folders based on the group.

```
Doctor Who/
  Doctor Who - 01-01 Rose.mp4
```

The hierarchical layout uses folders for both group and subgroup and does not repeat those pieces of information in the filename.

```
Doctor Who/
  Season 1/
    01 Rose.mp4
```
 CMFS allows hybrids between flat and hierarchical storage options.


## Examples

```
Artist/
  Artist.jpg
  Artist.txt
  Album/
    Track 01.m4a
    Track 01.jpg
 ```
 
This gives:
1. Media item: Track 01.m4a
2. Media item satellite: Track 01.jpg (it shares a name with the media item)
3. Collection: Album (the parent folder of the media item)
4. Group: Artist (because the group cannot be parsed from the filename Track 01.m4a, so we look at grandparent folder)
5. Group satellite: Artist.jpg (it shares a name with the group)
6. Subgroup: Album (because the subgroup cannot be parsed from the filename Track 01.m4a, so we look at parent folder)
 
 
 ```
Movies/
  Film Series.jpg
  Film Series/
    Film Series - Episode Name.mp4
    Film Series - Episode Name.jpg
 ```

This gives:
1. Media item: Film Series - Episode Name.mp4
2. Media item satellite: Film Series - Episode Name.jpg (it shares a name with the media item)
3. Collection: Film Series (the parent folder of the media item)
4. Collection satellite: Film Series.jpg (it shares a name with the collection)
5. Group: Film Series (because the group can be parsed from the filename Film Series - Episode Name.mp4)
6. Group satellite: Film Series.jpg (it shares a name with the group)
7. Subgroup & subgroup satellite: None (the subgroup would be obtained from the parent folder, but it has the same name as the group and the grandparent folder doesn't match the group name, so there is no subgroup)

```
Collection/
  TV Show - 01-01 Episode.mp4
  TV Show.jpg
  Another TV Show - 01-01 Episode.mp4
```

This gives:
1. Media items: TV Show - 01-01 Episode.mp4 and Another TV Show - 01-01 Episode.mp4


For TV Show - 01-01 Episode.mp4:
1. Collection: Collection (the parent folder of the media item)
2. Group: TV Show (by parsing)
3. Group satellite: TV Show.jpg (it shares a name with the group)
4. Subgroup: Season 1 (by parsing)

    
    
